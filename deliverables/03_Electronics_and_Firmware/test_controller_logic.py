#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Модульные программные тесты логики управления высевающим узлом (Кейс AT9-3, Б1: С5, С6).
ВНИМАНИЕ: Эти тесты проверяют корректность алгоритма расчёта скорости, отбраковки
мусора, безопасной расклиновки и запрет автозапуска на заданных входах; они НЕ
заменяют натурное испытание с реальными семенами.
"""

import unittest


STEPS_PER_REV = 3200  # 200 * 16 микрошаг
SERVO_HOME_DEG = 15
SERVO_DIVERT_DEG = 68
MAX_ANTI_JAM_TRIES = 2


class SeederControllerModel:
    """Точная программная модель логики контроллера для проверки C5, C6, лазера и расклиновки."""

    def __init__(self, cell_count: int = 12):
        self.cell_count = cell_count
        self.state = "IDLE"
        self.en_pin_high = True  # HIGH = драйвер отключён
        self.target_revs = 0
        self.target_rate_sps = 2.0
        self.steps_executed = 0
        self.servo_deg = SERVO_HOME_DEG
        self.trash_count = 0
        self.anti_jam_attempts = 0

    def power_on_reset(self):
        self.state = "IDLE"
        self.en_pin_high = True
        self.target_revs = 0
        self.steps_executed = 0
        self.servo_deg = SERVO_HOME_DEG
        self.anti_jam_attempts = 0

    def compute_step_interval_us(self, rate_sps: float) -> int:
        rate_sps = max(0.5, min(6.0, rate_sps))
        rpm = (rate_sps * 60.0) / self.cell_count
        steps_per_sec = (rpm / 60.0) * STEPS_PER_REV
        return round(1_000_000.0 / steps_per_sec)

    def adjust_rate(self, delta_sps: float) -> float:
        self.target_rate_sps = max(0.5, min(6.0, round(self.target_rate_sps + delta_sps, 1)))
        return self.target_rate_sps

    def start_series(self, rate_sps: float, target_revs: int):
        self.target_rate_sps = rate_sps
        self.target_revs = target_revs
        self.steps_executed = 0
        self.anti_jam_attempts = 0
        self.en_pin_high = False
        self.state = "RUNNING"

    def trigger_laser_trash_diverter(self):
        self.trash_count += 1
        self.servo_deg = SERVO_DIVERT_DEG

    def check_rotation_feedback(self, ms_since_last_optical_pulse: int) -> bool:
        expected_cell_ms = 1000.0 / self.target_rate_sps
        timeout_ms = int(expected_cell_ms * 2.5) + 400
        if ms_since_last_optical_pulse > timeout_ms:
            if self.anti_jam_attempts < MAX_ANTI_JAM_TRIES:
                self.anti_jam_attempts += 1
                self.state = "ANTI_JAM_REVERSE"
                return False
            self.state = "FAULT_NO_FEEDBACK"
            self.en_pin_high = True
            self.servo_deg = SERVO_HOME_DEG
            return False
        self.anti_jam_attempts = 0
        self.state = "RUNNING"
        return True


class TestSeederControlScenarios(unittest.TestCase):
    def test_c5_rate_change_step_timing(self):
        """Сценарий С5: Проверка пересчёта скорости и кнопок RATE+/RATE- при смене подачи."""
        ctrl = SeederControllerModel(cell_count=12)
        self.assertEqual(ctrl.compute_step_interval_us(2.0), 1875)
        self.assertEqual(ctrl.compute_step_interval_us(1.5), 2500)
        self.assertEqual(ctrl.compute_step_interval_us(3.0), 1250)
        self.assertEqual(ctrl.adjust_rate(+0.5), 2.5)
        self.assertEqual(ctrl.adjust_rate(+4.0), 6.0)
        self.assertEqual(ctrl.adjust_rate(-10.0), 0.5)

    def test_c6_no_autostart_or_blind_resume_after_power_loss(self):
        """Сценарий С6: При сбросе/восстановлении питания самозапуск и повтор исключены."""
        ctrl = SeederControllerModel(cell_count=12)
        self.assertEqual(ctrl.state, "IDLE")
        self.assertTrue(ctrl.en_pin_high)

        ctrl.start_series(rate_sps=2.0, target_revs=10)
        ctrl.steps_executed = 12800
        self.assertEqual(ctrl.state, "RUNNING")
        self.assertFalse(ctrl.en_pin_high)

        ctrl.power_on_reset()
        self.assertEqual(ctrl.state, "IDLE")
        self.assertTrue(ctrl.en_pin_high)
        self.assertEqual(ctrl.target_revs, 0)
        self.assertEqual(ctrl.steps_executed, 0)
        self.assertEqual(ctrl.servo_deg, SERVO_HOME_DEG)

    def test_anti_jam_reverse_then_safe_stop_on_persistent_stall(self):
        """А3: Сначала 2 попытки реверса на 15°, при сохранении потери связи — SAFE STOP."""
        ctrl = SeederControllerModel(cell_count=12)
        ctrl.start_series(rate_sps=2.0, target_revs=5)
        self.assertTrue(ctrl.check_rotation_feedback(450))
        self.assertEqual(ctrl.state, "RUNNING")

        # 1-й таймаут -> безопасный реверс (попытка 1)
        self.assertFalse(ctrl.check_rotation_feedback(1700))
        self.assertEqual(ctrl.state, "ANTI_JAM_REVERSE")
        self.assertFalse(ctrl.en_pin_high)

        # 2-й таймаут -> реверс (попытка 2)
        self.assertFalse(ctrl.check_rotation_feedback(1700))
        self.assertEqual(ctrl.state, "ANTI_JAM_REVERSE")

        # 3-й таймаут -> жёсткая остановка FAULT_NO_FEEDBACK, EN=HIGH
        self.assertFalse(ctrl.check_rotation_feedback(1700))
        self.assertEqual(ctrl.state, "FAULT_NO_FEEDBACK")
        self.assertTrue(ctrl.en_pin_high)

    def test_laser_trash_diverter_branch(self):
        """Лазерный детектор примесей переводит заслонку SG90 в ветку сброса мусора."""
        ctrl = SeederControllerModel(cell_count=12)
        self.assertEqual(ctrl.servo_deg, SERVO_HOME_DEG)
        ctrl.trigger_laser_trash_diverter()
        self.assertEqual(ctrl.trash_count, 1)
        self.assertEqual(ctrl.servo_deg, SERVO_DIVERT_DEG)


if __name__ == "__main__":
    unittest.main(verbosity=2)
