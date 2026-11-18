import JSZip from 'jszip';
import * as THREE from 'three';
import { INITIAL_TRIAL_LOGS, VARIANT_A_PARAMS, VARIANT_B_PARAMS } from '../data/deliverablesContent';
import { DiscParams, TrialLogRow } from '../types/engineering';
import { generateAssemblyOpenScad, generateDiscOpenScad } from './cadOpenScad';
import {
  generateArduinoFirmware,
  generatePythonLogicTests,
  generateSlicerProfileIni,
  rowsToCsv,
} from './firmwareAndTests';
import {
  generateA2ReportMd,
  generateA3ReportMd,
  generateA4ReportMd,
  generateB1ReportMd,
  generateB2ReportMd,
  generateB3ReportMd,
  generateMasterReadmeMd,
} from './markdownReports';
import {
  buildHousingPrintGroup,
  buildParametricDiscGroup,
  exportObjectToBinaryStl,
} from './stlExporter';
import {
  generateAssemblySectionSvg,
  generateDiscCriticalDrawingSvg,
  generateElectricalSchematicSvg,
} from './svgDrawings';
import { type DiagramBuffers, generateTask1DocxBytes } from './task1DocxExporter';
import { generatePresentationPptxBytes } from './presentationPptxExporter';
import { generateDefenseScriptDocxBytes } from './defenseScriptDocxExporter';

async function fetchPngUint8(url: string): Promise<Uint8Array | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return undefined;
  }
}

export async function loadDiagramBuffers(): Promise<DiagramBuffers> {
  const [economicsPng, discGeomPng, assemblyCyclePng] = await Promise.all([
    fetchPngUint8('/assets/diagrams/economics_breakeven.png'),
    fetchPngUint8('/assets/diagrams/disc_variants_ab.png'),
    fetchPngUint8('/assets/diagrams/seeder_stand_cycle.png'),
  ]);
  return { economicsPng, discGeomPng, assemblyCyclePng };
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadTextFile(content: string, filename: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  triggerBlobDownload(blob, filename);
}

export async function downloadTask1Docx(): Promise<void> {
  const diagrams = await loadDiagramBuffers();
  const bytes = await generateTask1DocxBytes(diagrams);
  triggerBlobDownload(
    new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    'AT9-3_Zadanie1_Assembler.docx'
  );
}

export async function downloadPresentationPptx(): Promise<void> {
  const diagrams = await loadDiagramBuffers();
  const bytes = await generatePresentationPptxBytes(diagrams);
  triggerBlobDownload(
    new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }),
    'AT9-3_Prezentatsiya_Assembler.pptx'
  );
}

export async function downloadDefenseScriptDocx(): Promise<void> {
  const bytes = await generateDefenseScriptDocxBytes();
  triggerBlobDownload(
    new Blob([bytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    'AT9-3_Tekst_Zashchity_Assembler.docx'
  );
}

export function downloadDiscStl(params: DiscParams, filename: string) {
  const mat = new THREE.MeshBasicMaterial();
  const group = buildParametricDiscGroup(params, mat);
  const stlBytes = exportObjectToBinaryStl(group, `AT9-3_${params.variantId}_N${params.cellCount}`);
  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry.dispose();
  });
  mat.dispose();
  triggerBlobDownload(new Blob([stlBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' }), filename);
}

export function downloadHousingStl() {
  const mat = new THREE.MeshBasicMaterial();
  const group = buildHousingPrintGroup(mat);
  const stlBytes = exportObjectToBinaryStl(group, 'AT9-3_Housing_Body');
  group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry.dispose();
  });
  mat.dispose();
  triggerBlobDownload(new Blob([stlBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' }), 'housing_body.stl');
}

export async function downloadFullDeliverablesZip(
  currentParams: DiscParams,
  logRows: TrialLogRow[]
): Promise<void> {
  const zip = new JSZip();
  const dummyMat = new THREE.MeshBasicMaterial();
  const diagrams = await loadDiagramBuffers();

  const buildStlBytes = (group: THREE.Group, header: string) => {
    const bytes = exportObjectToBinaryStl(group, header);
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry.dispose();
    });
    return bytes;
  };

  // 00_Zadanie1_and_Presentation
  const docDir = zip.folder('00_Zadanie1_and_Presentation')!;
  const [docxBytes, pptxBytes, scriptBytes] = await Promise.all([
    generateTask1DocxBytes(diagrams),
    generatePresentationPptxBytes(diagrams),
    generateDefenseScriptDocxBytes(),
  ]);
  docDir.file('AT9-3_Zadanie1_Assembler.docx', docxBytes);
  docDir.file('AT9-3_Prezentatsiya_Assembler.pptx', pptxBytes);
  docDir.file('AT9-3_Tekst_Zashchity_Assembler.docx', scriptBytes);

  // 01_CAD_Models
  const cadDir = zip.folder('01_CAD_Models')!;
  cadDir.file('seeder_disc_parametric.scad', generateDiscOpenScad(currentParams));
  cadDir.file('seeder_assembly.scad', generateAssemblyOpenScad(currentParams));
  cadDir.file('disk_variant_A_straight.stl', buildStlBytes(buildParametricDiscGroup(VARIANT_A_PARAMS, dummyMat), 'AT9-3_Variant_A'));
  cadDir.file('disk_variant_B_chamfer.stl', buildStlBytes(buildParametricDiscGroup(VARIANT_B_PARAMS, dummyMat), 'AT9-3_Variant_B'));
  if (currentParams.variantId === 'custom') {
    cadDir.file('disk_custom_parametric.stl', buildStlBytes(buildParametricDiscGroup(currentParams, dummyMat), 'AT9-3_Custom'));
  }
  cadDir.file('housing_body.stl', buildStlBytes(buildHousingPrintGroup(dummyMat), 'AT9-3_Housing'));

  dummyMat.dispose();

  // 02_Drawings_and_Slicing
  const drawDir = zip.folder('02_Drawings_and_Slicing')!;
  drawDir.file('drawing_disk_variant_A.svg', generateDiscCriticalDrawingSvg(VARIANT_A_PARAMS));
  drawDir.file('drawing_disk_variant_B.svg', generateDiscCriticalDrawingSvg(VARIANT_B_PARAMS));
  drawDir.file('drawing_assembly_section.svg', generateAssemblySectionSvg());
  if (diagrams.discGeomPng) drawDir.file('konstruktsiya_diska_AT9-3.png', diagrams.discGeomPng);
  if (diagrams.assemblyCyclePng) drawDir.file('kinematicheskaya_skhema_AT9-3.png', diagrams.assemblyCyclePng);
  drawDir.file('slicer_profile_PETG.ini', generateSlicerProfileIni());
  drawDir.file('A2_technology_and_tolerances.md', generateA2ReportMd());

  // 03_Electronics_and_Firmware
  const elecDir = zip.folder('03_Electronics_and_Firmware')!;
  elecDir.file('electrical_schematic.svg', generateElectricalSchematicSvg());
  elecDir.file('seeder_controller.ino', generateArduinoFirmware(currentParams));
  elecDir.file('test_controller_logic.py', generatePythonLogicTests());
  elecDir.file('A3_control_and_safety_manual.md', generateA3ReportMd());

  // 04_Accounting_and_Logs
  const logDir = zip.folder('04_Accounting_and_Logs')!;
  logDir.file('A4_video_registration_methodology.md', generateA4ReportMd());
  logDir.file('seeder_trial_log_template.csv', rowsToCsv([]));
  logDir.file('seeder_trial_log_example.csv', rowsToCsv(logRows.length > 0 ? logRows : INITIAL_TRIAL_LOGS));

  // 05_Part_B_Tests_and_Final
  const partBDir = zip.folder('05_Part_B_Tests_and_Final')!;
  partBDir.file('B1_test_protocol_C1_C6.md', generateB1ReportMd());
  partBDir.file('B2_quality_metrics_and_time_budget.md', generateB2ReportMd());
  partBDir.file('B3_specification_BOM_and_final_checklist.md', generateB3ReportMd());

  zip.file('README_ОПИСЬ_ФАЙЛОВ.md', generateMasterReadmeMd());

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, 'AT9-3_Zadanie2_Polny_Paket.zip');
}
