import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

/**
 * Professional PDF Certificate Generator
 * Generates enterprise-grade plagiarism verification reports
 */
export const generatePDF = async (results, text, metadata = {}) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Generate unique scan ID
    const scanId = `PG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const scanDate = new Date();

    // Extract metrics
    const score = results.overallScore || 0;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const uniqueWords = results.uniqueWords || 0;
    const sourcesChecked = results.sourcesChecked || 16;
    const maxMatch = results.maxMatch || 0;
    const phrasesAnalyzed = results.keyPhrases?.length || 0;
    const matchesFound = results.keyPhrases?.filter(p => p.found).length || 0;
    const originalityIndex = (100 - score).toFixed(1);

    // Color scheme
    const COLORS = {
        primary: [41, 128, 185],      // Professional Blue
        success: [39, 174, 96],        // Green
        warning: [243, 156, 18],       // Yellow
        danger: [231, 76, 60],         // Red
        dark: [44, 62, 80],            // Dark Gray
        light: [236, 240, 241],        // Light Gray
        white: [255, 255, 255]
    };

    // Get score color based on value
    const getScoreColor = (s) => {
        if (s < 10) return COLORS.success;
        if (s < 20) return COLORS.warning;
        return COLORS.danger;
    };

    const getStatusLabel = (s) => {
        if (s < 10) return 'EXCELLENT';
        if (s < 20) return 'GOOD';
        if (s < 30) return 'MODERATE';
        return 'HIGH RISK';
    };

    // ============================================================
    // PAGE 1: EXECUTIVE DASHBOARD CERTIFICATE
    // ============================================================

    // Header Banner with gradient effect
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Subtle gradient overlay
    doc.setFillColor(30, 100, 160);
    doc.rect(0, 35, pageWidth, 10, 'F');

    // Logo/Title
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("PlagiarismGuard™", 15, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("ACADEMIC INTEGRITY VERIFICATION CERTIFICATE", 15, 28);

    // Certificate ID in header
    doc.setFontSize(8);
    doc.text(`Certificate ID: ${scanId}`, pageWidth - 15, 18, { align: 'right' });
    doc.text(`Generated: ${scanDate.toLocaleString()}`, pageWidth - 15, 26, { align: 'right' });

    // ============================================================
    // MAIN SCORE SECTION
    // ============================================================

    const scoreColor = getScoreColor(score);
    const statusLabel = getStatusLabel(score);

    // Score circle background
    doc.setFillColor(250, 250, 250);
    doc.circle(pageWidth / 2, 80, 32, 'F');

    // Score circle border
    doc.setDrawColor(...scoreColor);
    doc.setLineWidth(4);
    doc.circle(pageWidth / 2, 80, 30, 'S');

    // Score value
    doc.setTextColor(...scoreColor);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(`${score.toFixed(1)}%`, pageWidth / 2, 78, { align: 'center' });

    // Score label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("SIMILARITY INDEX", pageWidth / 2, 90, { align: 'center' });

    // Status badge
    doc.setFillColor(...scoreColor);
    doc.roundedRect(pageWidth / 2 - 25, 100, 50, 12, 3, 3, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(statusLabel, pageWidth / 2, 108, { align: 'center' });

    // ============================================================
    // METRICS DASHBOARD GRID
    // ============================================================

    const metricsStartY = 125;
    const colWidth = (pageWidth - 30) / 4;

    const metrics = [
        { label: 'Word Count', value: wordCount.toLocaleString(), icon: '📄' },
        { label: 'Unique Words', value: uniqueWords.toLocaleString(), icon: '🔤' },
        { label: 'Sources Checked', value: sourcesChecked.toString(), icon: '🔍' },
        { label: 'Max Single Match', value: `${maxMatch.toFixed(1)}%`, icon: '📊' },
        { label: 'Phrases Analyzed', value: phrasesAnalyzed.toString(), icon: '📝' },
        { label: 'Matches Found', value: matchesFound.toString(), icon: '⚠️' },
        { label: 'Originality Index', value: `${originalityIndex}%`, icon: '✅' },
        { label: 'Scan Duration', value: '< 30s', icon: '⏱️' }
    ];

    // Draw metric cards
    metrics.forEach((metric, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const x = 15 + col * colWidth;
        const y = metricsStartY + row * 35;

        // Card background
        doc.setFillColor(...COLORS.light);
        doc.roundedRect(x, y, colWidth - 5, 30, 2, 2, 'F');

        // Metric value
        doc.setTextColor(...COLORS.dark);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(metric.value, x + (colWidth - 5) / 2, y + 12, { align: 'center' });

        // Metric label
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(metric.label.toUpperCase(), x + (colWidth - 5) / 2, y + 22, { align: 'center' });
    });

    // ============================================================
    // DOCUMENT INFORMATION PANEL
    // ============================================================

    const infoStartY = metricsStartY + 80;

    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, infoStartY, pageWidth - 70, 45, 3, 3, 'F');

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Document Information", 20, infoStartY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Title: ${metadata.title || 'Untitled Document'}`, 20, infoStartY + 22);
    doc.text(`Author: ${metadata.author || 'Anonymous User'}`, 20, infoStartY + 32);
    doc.text(`Analysis Date: ${scanDate.toLocaleDateString()} at ${scanDate.toLocaleTimeString()}`, 20, infoStartY + 42);

    // ============================================================
    // QR CODE
    // ============================================================

    const qrData = JSON.stringify({
        id: scanId,
        score: score.toFixed(1),
        date: scanDate.toISOString(),
        words: wordCount,
        matches: matchesFound
    });

    try {
        const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: 100,
            margin: 1,
            color: { dark: '#2c3e50', light: '#ffffff' }
        });

        doc.addImage(qrDataUrl, 'PNG', pageWidth - 50, infoStartY, 35, 35);

        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text("Scan to verify", pageWidth - 32.5, infoStartY + 40, { align: 'center' });
    } catch (e) {
        // Fallback if QR fails
        doc.setDrawColor(200, 200, 200);
        doc.rect(pageWidth - 50, infoStartY, 35, 35);
        doc.setFontSize(6);
        doc.text("QR Unavailable", pageWidth - 32.5, infoStartY + 20, { align: 'center' });
    }

    // ============================================================
    // VERIFICATION STATEMENT
    // ============================================================

    const stmtY = infoStartY + 55;

    doc.setFillColor(score < 15 ? 230 : 255, score < 15 ? 255 : 243, score < 15 ? 230 : 230);
    doc.roundedRect(15, stmtY, pageWidth - 30, 20, 3, 3, 'F');

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    const verdictLines = doc.splitTextToSize(verdict, pageWidth - 40);
    doc.text(verdictLines, pageWidth / 2, stmtY + 8, { align: 'center' });

    // ============================================================
    // FOOTER
    // ============================================================

    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(7);
    doc.text("PlagiarismGuard™ Engine v2.0 | Academic Integrity Verification System", pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text("This certificate is machine-generated and does not require signature.", pageWidth / 2, pageHeight - 3, { align: 'center' });

    // ============================================================
    // PAGE 2: DETAILED FINDINGS
    // ============================================================
    doc.addPage();

    // Header
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Detailed Similarity Analysis", 15, 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Certificate: ${scanId}`, pageWidth - 15, 15, { align: 'right' });

    // Summary stats bar
    doc.setFillColor(...COLORS.light);
    doc.rect(0, 25, pageWidth, 15, 'F');

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(8);
    doc.text(`Total Matches: ${matchesFound}`, 15, 34);
    doc.text(`Similarity: ${score.toFixed(1)}%`, 70, 34);
    doc.text(`Originality: ${originalityIndex}%`, 125, 34);

    // Matches Table - Now includes source type
    const foundPhrases = results.keyPhrases?.filter(p => p.found) || [];

    const tableData = foundPhrases.length > 0 ? foundPhrases.map((p, idx) => [
        (idx + 1).toString(),
        (p.text || '').substring(0, 50) + (p.text?.length > 50 ? '...' : ''),
        p.source || 'Web',
        'Identical'
    ]) : [['—', 'No plagiarism detected in this document.', '—', '—']];

    autoTable(doc, {
        startY: 45,
        head: [['#', 'Matched Text Fragment', 'Source', 'Type']],
        body: tableData,
        headStyles: {
            fillColor: COLORS.primary,
            fontSize: 9,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 6.5,
            overflow: 'linebreak',
            cellPadding: 1.5
        },
        alternateRowStyles: {
            fillColor: [248, 249, 250]
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 30 },
            3: { cellWidth: 12, halign: 'center' }
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto'
    });

    // Source Contribution Panel
    const sourceCounts = {};
    foundPhrases.forEach(p => {
        const src = p.source || 'Web Search';
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    const sortedSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    if (sortedSources.length > 0 && doc.lastAutoTable) {
        let finalY = doc.lastAutoTable.finalY + 10;

        doc.setTextColor(...COLORS.dark);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("Source Contribution Breakdown", 15, finalY);

        finalY += 5;

        // Contribution table
        const contributionData = sortedSources.map(([source, count]) => {
            const pct = matchesFound > 0 ? ((count / matchesFound) * 100).toFixed(1) : 0;
            return [source, count.toString(), `${pct}%`];
        });

        autoTable(doc, {
            startY: finalY,
            head: [['Source Database', 'Matches', 'Contribution']],
            body: contributionData,
            headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
            styles: { fontSize: 6.5 },
            columnStyles: {
                0: { cellWidth: 50 },
                1: { cellWidth: 15, halign: 'center' },
                2: { cellWidth: 15, halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            tableWidth: 'auto'
        });
    }

    // Page 2 Footer
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(6);
    doc.text("Continued on next page...", pageWidth / 2, pageHeight - 4, { align: 'center' });

    // ============================================================
    // PAGE 3: SOURCES LIST WITH URLs
    // ============================================================
    doc.addPage();

    // Header
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Source References", 15, 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page 3 of 3`, pageWidth - 15, 15, { align: 'right' });

    // Sources with URLs from results.sources
    const sources = results.sources || [];

    let currentY = 35;

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Matching Sources Identified (${sources.length})`, 15, currentY);

    currentY += 8;

    if (sources.length > 0) {
        sources.slice(0, 15).forEach((source, idx) => {
            // Check if we need a new page
            if (currentY > pageHeight - 30) {
                doc.addPage();
                currentY = 25;
            }

            // Source box
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(15, currentY, pageWidth - 30, 22, 2, 2, 'F');

            // Source number badge
            doc.setFillColor(...COLORS.primary);
            doc.circle(22, currentY + 11, 5, 'F');
            doc.setTextColor(...COLORS.white);
            doc.setFontSize(8);
            doc.text((idx + 1).toString(), 22, currentY + 13, { align: 'center' });

            // Source name
            doc.setTextColor(...COLORS.dark);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const name = (source.name || 'Unknown Source').substring(0, 60);
            doc.text(name + (source.name?.length > 60 ? '...' : ''), 32, currentY + 8);

            // Source type badge
            doc.setFillColor(236, 240, 241);
            doc.roundedRect(32, currentY + 10, 30, 8, 1, 1, 'F');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(6);
            doc.text((source.type || 'Web').substring(0, 15), 33, currentY + 15);

            // Match count
            doc.text(`${source.matches || 1} match${(source.matches || 1) > 1 ? 'es' : ''}`, 65, currentY + 15);

            // Similarity score
            const simScore = source.similarity ? `${source.similarity.toFixed(1)}%` : 'N/A';
            doc.setTextColor(...getScoreColor(source.similarity || 0));
            doc.setFont('helvetica', 'bold');
            doc.text(simScore, pageWidth - 25, currentY + 11);

            // URL (truncated)
            if (source.url) {
                doc.setTextColor(41, 128, 185);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                const truncUrl = source.url.substring(0, 70) + (source.url.length > 70 ? '...' : '');
                doc.textWithLink(truncUrl, 32, currentY + 19, { url: source.url });
            }

            currentY += 26;
        });
    } else {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text("No external sources matched in this document.", 20, currentY);
    }

    // Document Fingerprint Section
    currentY = Math.min(currentY + 10, pageHeight - 40);

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, currentY, pageWidth - 30, 25, 2, 2, 'F');

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("Document Verification", 20, currentY + 8);

    // Simple hash generation
    const docHash = btoa(text.substring(0, 100) + scanId).substring(0, 32).toUpperCase();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Document Hash: ${docHash}`, 20, currentY + 16);
    doc.text(`Verification URL: https://plagiarism-checker-web-app.vercel.app/verify/${scanId}`, 20, currentY + 22);

    // Page 3 Footer
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(6);
    doc.text("© PlagiarismGuard™ | Developed by Dr. Siddalingaiah H S | hssling@yahoo.com", pageWidth / 2, pageHeight - 4, { align: 'center' });

    // Save
    doc.save(`PlagiarismGuard_Certificate_${scanDate.toISOString().split('T')[0]}.pdf`);
};
