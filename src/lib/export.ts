import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import type { Praise, Room, Student } from '../types';
import { formatDate } from './utils';

function buildExportHtml(
  room: Room,
  student: Student,
  praises: Praise[],
  students: Student[],
): string {
  const studentMap = new Map(students.map((s) => [s.id, s.name]));
  const cards = praises
    .map((p) => {
      const fromName = studentMap.get(p.from_student_id) ?? '?';
      return `
        <div style="background:${p.color};padding:16px;border-radius:12px;min-height:80px;box-shadow:2px 2px 8px rgba(0,0,0,0.1);">
          <div style="font-size:12px;font-weight:bold;color:#555;margin-bottom:8px;">from ${fromName}</div>
          <div style="font-size:14px;line-height:1.5;color:#333;">${p.content}</div>
        </div>`;
    })
    .join('');

  return `
    <div style="font-family:'Noto Sans KR',sans-serif;padding:40px;background:#FFF9F0;width:794px;">
      <h1 style="font-size:24px;color:#FF6B6B;margin:0 0 8px;">${room.class_name} 칭찬 롤링페이퍼</h1>
      <p style="color:#888;margin:0 0 24px;">${formatDate(new Date())}</p>
      <hr style="border:none;border-top:2px dashed #FFD3E0;margin-bottom:24px;">
      <h2 style="font-size:20px;color:#333;margin-bottom:20px;">${student.name}에게 온 칭찬</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        ${cards || '<p style="color:#888;">아직 칭찬이 없어요</p>'}
      </div>
    </div>`;
}

async function renderToCanvas(html: string): Promise<HTMLCanvasElement> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#FFF9F0',
  });

  document.body.removeChild(container);
  return canvas;
}

export async function exportStudentPdf(
  room: Room,
  student: Student,
  praises: Praise[],
  students: Student[],
): Promise<void> {
  const html = buildExportHtml(room, student, praises, students);
  const canvas = await renderToCanvas(html);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${student.name}_칭찬롤링페이퍼.pdf`);
}

export async function exportStudentPng(
  room: Room,
  student: Student,
  praises: Praise[],
  students: Student[],
): Promise<void> {
  const html = buildExportHtml(room, student, praises, students);
  const canvas = await renderToCanvas(html);
  const link = document.createElement('a');
  link.download = `${student.name}_칭찬롤링페이퍼.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportAllZip(
  room: Room,
  students: Student[],
  allPraises: Praise[],
): Promise<void> {
  const zip = new JSZip();

  for (const student of students) {
    const praises = allPraises.filter((p) => p.to_student_id === student.id && !p.deleted);
    if (praises.length === 0) continue;

    const html = buildExportHtml(room, student, praises, students);
    const canvas = await renderToCanvas(html);
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    const blob = pdf.output('blob');
    zip.file(`${student.name}_칭찬롤링페이퍼.pdf`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `${room.class_name}_칭찬롤링페이퍼.zip`;
  link.click();
  URL.revokeObjectURL(link.href);
}
