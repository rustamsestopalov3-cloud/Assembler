import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { INITIAL_TRIAL_LOGS, VARIANT_A_PARAMS, VARIANT_B_PARAMS } from '../src/data/deliverablesContent';
import { generateAssemblyOpenScad, generateDiscOpenScad } from '../src/generators/cadOpenScad';
import {
  generateArduinoFirmware,
  generatePythonLogicTests,
  generateSlicerProfileIni,
  rowsToCsv,
} from '../src/generators/firmwareAndTests';
import {
  generateA2ReportMd,
  generateA3ReportMd,
  generateA4ReportMd,
  generateB1ReportMd,
  generateB2ReportMd,
  generateB3ReportMd,
  generateMasterReadmeMd,
} from '../src/generators/markdownReports';
import {
  buildHousingPrintGroup,
  buildParametricDiscGroup,
  exportObjectToBinaryStl,
} from '../src/generators/stlExporter';
import {
  generateAssemblySectionSvg,
  generateDiscCriticalDrawingSvg,
  generateElectricalSchematicSvg,
} from '../src/generators/svgDrawings';
import { type DiagramBuffers, generateTask1DocxBytes } from '../src/generators/task1DocxExporter';
import { generatePresentationPptxBytes } from '../src/generators/presentationPptxExporter';
import { generateDefenseScriptDocxBytes } from '../src/generators/defenseScriptDocxExporter';

const readDiagram = (name: string): Uint8Array | undefined => {
  const full = path.resolve(process.cwd(), 'public/assets/diagrams', name);
  return fs.existsSync(full) ? new Uint8Array(fs.readFileSync(full)) : undefined;
};

async function main() {
  const outRoot = path.resolve(process.cwd(), 'deliverables');
  const dirs = [
    '00_Zadanie1_and_Presentation',
    '01_CAD_Models',
    '02_Drawings_and_Slicing',
    '03_Electronics_and_Firmware',
    '04_Accounting_and_Logs',
    '05_Part_B_Tests_and_Final',
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(outRoot, d), { recursive: true });
  }

  const diagrams: DiagramBuffers = {
    economicsPng: readDiagram('economics_breakeven.png'),
    discGeomPng: readDiagram('disc_variants_ab.png'),
    assemblyCyclePng: readDiagram('seeder_stand_cycle.png'),
  };

  // 00_Zadanie1_and_Presentation
  const [docxBytes, pptxBytes, scriptBytes] = await Promise.all([
    generateTask1DocxBytes(diagrams),
    generatePresentationPptxBytes(diagrams),
    generateDefenseScriptDocxBytes(),
  ]);
  fs.writeFileSync(path.join(outRoot, '00_Zadanie1_and_Presentation/AT9-3_Zadanie1_Assembler.docx'), Buffer.from(docxBytes));
  fs.writeFileSync(path.join(outRoot, '00_Zadanie1_and_Presentation/AT9-3_Prezentatsiya_Assembler.pptx'), Buffer.from(pptxBytes));
  fs.writeFileSync(path.join(outRoot, '00_Zadanie1_and_Presentation/AT9-3_Tekst_Zashchity_Assembler.docx'), Buffer.from(scriptBytes));

  const dummyMat = new THREE.MeshBasicMaterial();

  const writeStl = (relPath: string, group: THREE.Group, header: string) => {
    const bytes = exportObjectToBinaryStl(group, header);
    fs.writeFileSync(path.join(outRoot, relPath), Buffer.from(bytes));
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry.dispose();
    });
  };

  // 01_CAD_Models
  fs.writeFileSync(path.join(outRoot, '01_CAD_Models/seeder_disc_parametric.scad'), generateDiscOpenScad(VARIANT_B_PARAMS), 'utf8');
  fs.writeFileSync(path.join(outRoot, '01_CAD_Models/seeder_assembly.scad'), generateAssemblyOpenScad(VARIANT_B_PARAMS), 'utf8');
  writeStl('01_CAD_Models/disk_variant_A_straight.stl', buildParametricDiscGroup(VARIANT_A_PARAMS, dummyMat), 'AT9-3_Variant_A');
  writeStl('01_CAD_Models/disk_variant_B_chamfer.stl', buildParametricDiscGroup(VARIANT_B_PARAMS, dummyMat), 'AT9-3_Variant_B');
  writeStl('01_CAD_Models/housing_body.stl', buildHousingPrintGroup(dummyMat), 'AT9-3_Housing');
  dummyMat.dispose();

  // 02_Drawings_and_Slicing
  fs.writeFileSync(path.join(outRoot, '02_Drawings_and_Slicing/drawing_disk_variant_A.svg'), generateDiscCriticalDrawingSvg(VARIANT_A_PARAMS), 'utf8');
  fs.writeFileSync(path.join(outRoot, '02_Drawings_and_Slicing/drawing_disk_variant_B.svg'), generateDiscCriticalDrawingSvg(VARIANT_B_PARAMS), 'utf8');
  fs.writeFileSync(path.join(outRoot, '02_Drawings_and_Slicing/drawing_assembly_section.svg'), generateAssemblySectionSvg(), 'utf8');
  if (diagrams.discGeomPng) {
    fs.writeFileSync(path.join(outRoot, '02_Drawings_and_Slicing/konstruktsiya_diska_AT9-3.png'), Buffer.from(diagrams.discGeomPng));
  }
  if (diagrams.assemblyCyclePng) {
    fs.writeFileSync(path.join(outRoot, '02_Drawings_and_Slicing/kinematicheskaya_skhema_AT9-3.png'), Buffer.from(diagrams.assemblyCyclePng));
  }
  fs.writeFileSync(path.join(outRoot, '02_Drawings_and_Slicing/slicer_profile_PETG.ini'), generateSlicerProfileIni(), 'utf8');
  fs.writeFileSync(path.join(outRoot, '02_Drawings_and_Slicing/A2_technology_and_tolerances.md'), generateA2ReportMd(), 'utf8');

  // 03_Electronics_and_Firmware
  fs.writeFileSync(path.join(outRoot, '03_Electronics_and_Firmware/electrical_schematic.svg'), generateElectricalSchematicSvg(), 'utf8');
  fs.writeFileSync(path.join(outRoot, '03_Electronics_and_Firmware/seeder_controller.ino'), generateArduinoFirmware(VARIANT_B_PARAMS), 'utf8');
  fs.writeFileSync(path.join(outRoot, '03_Electronics_and_Firmware/test_controller_logic.py'), generatePythonLogicTests(), 'utf8');
  fs.writeFileSync(path.join(outRoot, '03_Electronics_and_Firmware/A3_control_and_safety_manual.md'), generateA3ReportMd(), 'utf8');

  // 04_Accounting_and_Logs
  fs.writeFileSync(path.join(outRoot, '04_Accounting_and_Logs/A4_video_registration_methodology.md'), generateA4ReportMd(), 'utf8');
  fs.writeFileSync(path.join(outRoot, '04_Accounting_and_Logs/seeder_trial_log_template.csv'), rowsToCsv([]), 'utf8');
  fs.writeFileSync(path.join(outRoot, '04_Accounting_and_Logs/seeder_trial_log_example.csv'), rowsToCsv(INITIAL_TRIAL_LOGS), 'utf8');

  // 05_Part_B_Tests_and_Final
  fs.writeFileSync(path.join(outRoot, '05_Part_B_Tests_and_Final/B1_test_protocol_C1_C6.md'), generateB1ReportMd(), 'utf8');
  fs.writeFileSync(path.join(outRoot, '05_Part_B_Tests_and_Final/B2_quality_metrics_and_time_budget.md'), generateB2ReportMd(), 'utf8');
  fs.writeFileSync(path.join(outRoot, '05_Part_B_Tests_and_Final/B3_specification_BOM_and_final_checklist.md'), generateB3ReportMd(), 'utf8');

  fs.writeFileSync(path.join(outRoot, 'README_ОПИСЬ_ФАЙЛОВ.md'), generateMasterReadmeMd(), 'utf8');
  console.log('Deliverables generated in:', outRoot);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
