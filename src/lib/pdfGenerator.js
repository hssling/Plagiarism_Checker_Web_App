import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = (results, text, metadata = {}) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- PAGE 1: CERTIFICATE OF ORIGINALITY ---

    // 1. Header & Logo (Simulated)
    doc.setFillColor(41, 128, 185); // Professional Blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("PlagiarismGuard Certificate", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("OFFICIAL VERIFICATION REPORT", pageWidth / 2, 30, { align: 'center' });

    // 2. The Badge (Score) - Use the same field as dashboard
    const score = results.overallScore || 0;
    const isHigh = score > 15;
    const badgeColor = isHigh ? [231, 76, 60] : [39, 174, 96]; // Red vs Green

    doc.setFillColor(...badgeColor);
    doc.circle(pageWidth / 2, 80, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`${score.toFixed(1)}%`, pageWidth / 2, 82, { align: 'center' });
    doc.setFontSize(10);
    doc.text("SIMILARITY", pageWidth / 2, 92, { align: 'center' });

    // 3. Document Details
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Document Analysis Report", pageWidth / 2, 120, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Title: ${metadata.title || 'Untitled Document'}`, 20, 140);
    doc.text(`Author: ${metadata.author || 'Anonymous User'}`, 20, 150);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 160);
    doc.text(`Word Count: ${text.split(/\s+/).length} words`, 20, 170);
    doc.text(`Scan ID: ${Math.random().toString(36).substring(7).toUpperCase()}`, 20, 180);

    // 4. Verification QR (Placeholder)
    doc.setDrawColor(200, 200, 200);
    doc.rect(pageWidth - 60, 135, 40, 40); // Placeholder box
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan to Verify", pageWidth - 40, 180, { align: 'center' });

    // 5. Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This certificate confirms that the document has been scanned by PlagiarismGuard Engine v2.0.", pageWidth / 2, pageHeight - 10, { align: 'center' });

    // --- PAGE 2: DETAILED FINDINGS ---
    doc.addPage();

    // Header
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Detailed Findings", 15, 13);

    // Matches Table - Use actual keyPhrases data
    const foundPhrases = results.keyPhrases?.filter(p => p.found) || [];

    const tableData = foundPhrases.length > 0 ? foundPhrases.map(p => [
        (p.text || '').substring(0, 60) + (p.text?.length > 60 ? '...' : ''),
        '100%', // Exact match (since it was found)
        p.source || 'Web Search',
        'See detailed report' // URLs are in the full results
    ]) : [['No plagiarism detected.', '-', '-', '-']];

    autoTable(doc, {
        startY: 30,
        head: [['Suspect Text', 'Match %', 'Source', 'Notes']],
        body: tableData,
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 80 }, // Text
            1: { cellWidth: 20 }, // Score
            2: { cellWidth: 40 }, // Source
            3: { cellWidth: 40 }, // Notes
        }
    });

    // Save
    doc.save(`Plagiarism_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
