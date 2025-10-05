// interpolation.js

let chart, errorChart;
let lastUsedMethod = 'lagrange'; // Track the last used interpolation method

function getInputData() {
    const x = document.getElementById('xValues').value.split(',').map(Number);
    const y = document.getElementById('yValues').value.split(',').map(Number);
    return { x, y };
}

function lagrangeInterpolation(xData, yData, x) {
    let result = 0;
    const n = xData.length;
    for (let i = 0; i < n; i++) {
        let term = yData[i];
        for (let j = 0; j < n; j++) {
            if (j !== i) term *= (x - xData[j]) / (xData[i] - xData[j]);
        }
        result += term;
    }
    return result;
}

function dividedDifferenceTable(xData, yData) {
    const n = xData.length;
    let table = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) table[i][0] = yData[i];
    for (let j = 1; j < n; j++) {
        for (let i = 0; i < n - j; i++) {
            table[i][j] = (table[i+1][j-1] - table[i][j-1]) / (xData[i+j] - xData[i]);
        }
    }
    return table;
}

function newtonDividedInterpolation(xData, yData, x) {
    const n = xData.length;
    const table = dividedDifferenceTable(xData, yData);
    let result = table[0][0];
    let product = 1;
    for (let i = 1; i < n; i++) {
        product *= (x - xData[i-1]);
        result += table[0][i] * product;
    }
    return result;
}

function newtonForwardInterpolation(xData, yData, x) {
    // Check if data points are equally spaced
    const h = xData[1] - xData[0];
    const isEquallySpaced = xData.every((val, i) => {
        if (i === 0) return true;
        return Math.abs((val - xData[i-1]) - h) < 1e-10;
    });
    
    if (!isEquallySpaced) {
        // If not equally spaced, use Newton Divided Differences instead
        return newtonDividedInterpolation(xData, yData, x);
    }
    
    const n = xData.length;
    let diffTable = [...yData];
    let result = yData[0];
    let u = (x - xData[0]) / h;
    let fact = 1, uTerm = 1;

    for (let i = 1; i < n; i++) {
        for (let j = 0; j < n - i; j++) {
            diffTable[j] = diffTable[j+1] - diffTable[j];
        }
        uTerm *= (u - (i - 1));
        fact *= i;
        result += (uTerm * diffTable[0]) / fact;
    }
    return result;
}

function bezierInterpolation(xData, yData, x) {
    const n = xData.length;
    if (n < 2) return yData[0];
    
    // Normalize x to [0, 1] range for Bezier curve
    const minX = Math.min(...xData);
    const maxX = Math.max(...xData);
    const t = (x - minX) / (maxX - minX);
    
    // Create control points for Bezier curve
    // For interpolation, we use the data points as control points
    let controlPoints = [];
    for (let i = 0; i < n; i++) {
        controlPoints.push({x: i / (n - 1), y: yData[i]});
    }
    
    // Calculate Bezier curve point using De Casteljau's algorithm
    let points = [...controlPoints];
    for (let level = 1; level < n; level++) {
        for (let i = 0; i < n - level; i++) {
            points[i] = {
                x: (1 - t) * points[i].x + t * points[i + 1].x,
                y: (1 - t) * points[i].y + t * points[i + 1].y
            };
        }
    }
    
    return points[0].y;
}

function drawInterpolation(method) {
    const { x, y } = getInputData();
    if (!x.length || x.length !== y.length) return alert("x এবং y মান সঠিকভাবে দিন");

    lastUsedMethod = method; // Update the last used method
    let interpFunc;
    if (method === 'lagrange') interpFunc = (xi) => lagrangeInterpolation(x, y, xi);
    else if (method === 'divided') interpFunc = (xi) => newtonDividedInterpolation(x, y, xi);
    else if (method === 'forward') interpFunc = (xi) => newtonForwardInterpolation(x, y, xi);
    else if (method === 'bezier') interpFunc = (xi) => bezierInterpolation(x, y, xi);

    const minX = Math.min(...x), maxX = Math.max(...x);
    const step = (maxX - minX) / 100;
    let interpX = [], interpY = [], errorY = [];

    for (let xi = minX; xi <= maxX; xi += step) {
        const yi = interpFunc(xi);
        interpX.push(xi);
        interpY.push(yi);
        errorY.push(yi - lagrangeInterpolation(x, y, xi)); // Error vs Lagrange
    }

    // Define colors for different interpolation methods
    let methodColor;
    let methodName;
    if (method === 'lagrange') {
        methodColor = '#3b82f6'; // Blue
        methodName = 'Lagrange';
    } else if (method === 'divided') {
        methodColor = '#10b981'; // Green
        methodName = 'Newton Divided';
    } else if (method === 'forward') {
        methodColor = '#f59e0b'; // Orange
        methodName = 'Newton Forward';
    } else if (method === 'bezier') {
        methodColor = '#8b5cf6'; // Purple
        methodName = 'Bezier';
    }

    if (chart) chart.destroy();
    chart = new Chart(document.getElementById('chart').getContext('2d'), {
        type: 'line',
        data: {
            labels: interpX,
            datasets: [
                { label: 'Data Points', data: x.map((val, i) => ({x: val, y: y[i]})), pointBackgroundColor: '#ef4444', pointBorderColor: '#dc2626', showLine: false, pointRadius: 6, pointBorderWidth: 2 },
                { label: methodName + ' Interpolation', data: interpX.map((val, i) => ({x: val, y: interpY[i]})), borderColor: methodColor, backgroundColor: methodColor + '20', borderWidth: 3, fill: false, tension: 0.1 }
            ]
        },
        options: { 
            responsive: true, 
            plugins: { 
                tooltip: { mode: 'index', intersect: false },
                legend: {
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }, 
            scales: { 
                x: { type: 'linear', grid: { color: '#e5e7eb' } },
                y: { grid: { color: '#e5e7eb' } }
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });

    if (errorChart) errorChart.destroy();
    errorChart = new Chart(document.getElementById('errorChart').getContext('2d'), {
        type: 'line',
        data: { 
            labels: interpX, 
            datasets: [{ 
                label: 'Error vs Lagrange', 
                data: errorY, 
                borderColor: methodColor, 
                backgroundColor: methodColor + '10',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }] 
        },
        options: { 
            responsive: true, 
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: { 
                x: { type: 'linear', grid: { color: '#e5e7eb' } },
                y: { grid: { color: '#e5e7eb' } }
            }
        }
    });
}

function drawAllGraphs() {
    const { x, y } = getInputData();
    if (!x.length || x.length !== y.length) return alert("x এবং y মান সঠিকভাবে দিন");

    lastUsedMethod = 'all'; // Update the last used method
    const minX = Math.min(...x), maxX = Math.max(...x);
    const step = (maxX - minX) / 100;
    let interpX = [], lagrangeY = [], dividedY = [], forwardY = [], bezierY = [];

    // Calculate all four interpolation methods
    for (let xi = minX; xi <= maxX; xi += step) {
        interpX.push(xi);
        const lagrangeVal = lagrangeInterpolation(x, y, xi);
        const dividedVal = newtonDividedInterpolation(x, y, xi);
        const forwardVal = newtonForwardInterpolation(x, y, xi);
        const bezierVal = bezierInterpolation(x, y, xi);
        
        lagrangeY.push(lagrangeVal);
        dividedY.push(dividedVal);
        forwardY.push(forwardVal);
        bezierY.push(bezierVal);
        
        // Debug: Check if values are different (for first few points)
        if (interpX.length <= 5) {
            console.log(`x=${xi.toFixed(2)}: Lagrange=${lagrangeVal.toFixed(6)}, Divided=${dividedVal.toFixed(6)}, Forward=${forwardVal.toFixed(6)}, Bezier=${bezierVal.toFixed(6)}`);
        }
    }

    if (chart) chart.destroy();
    chart = new Chart(document.getElementById('chart').getContext('2d'), {
        type: 'line',
        data: {
            labels: interpX,
            datasets: [
                { 
                    label: 'Data Points', 
                    data: x.map((val, i) => ({x: val, y: y[i]})), 
                    pointBackgroundColor: '#ef4444', 
                    pointBorderColor: '#dc2626', 
                    showLine: false, 
                    pointRadius: 6, 
                    pointBorderWidth: 2 
                },
                { 
                    label: 'Lagrange Interpolation', 
                    data: interpX.map((val, i) => ({x: val, y: lagrangeY[i]})), 
                    borderColor: '#3b82f6', 
                    backgroundColor: '#3b82f620', 
                    borderWidth: 4, 
                    fill: false, 
                    tension: 0.1,
                    borderDash: []
                },
                { 
                    label: 'Newton Divided', 
                    data: interpX.map((val, i) => ({x: val, y: dividedY[i]})), 
                    borderColor: '#10b981', 
                    backgroundColor: '#10b98120', 
                    borderWidth: 3, 
                    fill: false, 
                    tension: 0.1,
                    borderDash: [5, 5]
                },
                { 
                    label: 'Newton Forward', 
                    data: interpX.map((val, i) => ({x: val, y: forwardY[i]})), 
                    borderColor: '#f59e0b', 
                    backgroundColor: '#f59e0b20', 
                    borderWidth: 3, 
                    fill: false, 
                    tension: 0.1,
                    borderDash: [10, 5]
                },
                { 
                    label: 'Bezier Interpolation', 
                    data: interpX.map((val, i) => ({x: val, y: bezierY[i]})), 
                    borderColor: '#8b5cf6', 
                    backgroundColor: '#8b5cf620', 
                    borderWidth: 3, 
                    fill: false, 
                    tension: 0.1,
                    borderDash: [2, 2]
                }
            ]
        },
        options: { 
            responsive: true, 
            plugins: { 
                tooltip: { mode: 'index', intersect: false },
                legend: {
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }, 
            scales: { 
                x: { type: 'linear', grid: { color: '#e5e7eb' } },
                y: { grid: { color: '#e5e7eb' } }
            },
            elements: {
                point: {
                    hoverRadius: 8
                }
            }
        }
    });

    // Create comparison error chart
    if (errorChart) errorChart.destroy();
    errorChart = new Chart(document.getElementById('errorChart').getContext('2d'), {
        type: 'line',
        data: { 
            labels: interpX, 
            datasets: [
                { 
                    label: 'Newton Divided vs Lagrange', 
                    data: interpX.map((val, i) => dividedY[i] - lagrangeY[i]), 
                    borderColor: '#10b981', 
                    backgroundColor: '#10b98110',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                },
                { 
                    label: 'Newton Forward vs Lagrange', 
                    data: interpX.map((val, i) => forwardY[i] - lagrangeY[i]), 
                    borderColor: '#f59e0b', 
                    backgroundColor: '#f59e0b10',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                },
                { 
                    label: 'Bezier vs Lagrange', 
                    data: interpX.map((val, i) => bezierY[i] - lagrangeY[i]), 
                    borderColor: '#8b5cf6', 
                    backgroundColor: '#8b5cf610',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                }
            ] 
        },
        options: { 
            responsive: true, 
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: { 
                x: { type: 'linear', grid: { color: '#e5e7eb' } },
                y: { grid: { color: '#e5e7eb' } }
            }
        }
    });
}

function showTable() {
    const { x, y } = getInputData();
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    x.forEach((val, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${i}</td><td>${val}</td><td>${y[i]}</td>`;
        tbody.appendChild(row);
    });
    document.getElementById('dataTable').style.display = 'table';
    document.getElementById('formulaBox').style.display = 'none';
}

function showFormula() {
    const { x, y } = getInputData();
    let formula = "";
    
    if (lastUsedMethod === 'lagrange') {
        // Lagrange Formula
        formula += "=== LAGRANGE FORMULA ===\n";
        formula += "P(x) = ";
        for (let i = 0; i < x.length; i++) {
            let term = y[i] + "";
            for (let j = 0; j < x.length; j++) {
                if (j !== i) term += `((x - ${x[j]})/(${x[i]} - ${x[j]}))`;
            }
            formula += (i !== 0 ? ' + ' : '') + term;
        }
    }
    else if (lastUsedMethod === 'divided') {
        // Newton Divided Differences Formula
        formula += "=== NEWTON DIVIDED DIFFERENCES ===\n";
        const divTable = dividedDifferenceTable(x, y);
        formula += "P(x) = " + divTable[0][0];
        for (let i = 1; i < x.length; i++) {
            let term = ` + ${divTable[0][i]}`;
            for (let j = 0; j < i; j++) {
                term += `(x - ${x[j]})`;
            }
            formula += term;
        }
    }
    else if (lastUsedMethod === 'forward') {
        // Newton Forward Formula
        formula += "=== NEWTON FORWARD DIFFERENCES ===\n";
        const h = x[1] - x[0];
        formula += `h = ${h}\n`;
        formula += "u = (x - x₀)/h = (x - " + x[0] + ")/" + h + "\n";
        formula += "P(x) = " + y[0];
        let diffTable = [...y];
        for (let i = 1; i < x.length; i++) {
            for (let j = 0; j < x.length - i; j++) {
                diffTable[j] = diffTable[j+1] - diffTable[j];
            }
            let term = ` + (${diffTable[0]}/${factorial(i)})`;
            for (let j = 0; j < i; j++) {
                term += `(u - ${j})`;
            }
            formula += term;
        }
    }
    else if (lastUsedMethod === 'bezier') {
        // Bezier Formula
        formula += "=== BEZIER INTERPOLATION ===\n";
        formula += "Using De Casteljau's algorithm:\n";
        formula += "t = (x - x_min) / (x_max - x_min)\n";
        formula += "Control Points: ";
        for (let i = 0; i < x.length; i++) {
            formula += `P${i}(${i/(x.length-1)}, ${y[i]})`;
            if (i < x.length - 1) formula += ", ";
        }
        formula += "\n\nBezier curve is calculated using recursive linear interpolation:\n";
        formula += "B(t) = (1-t)ⁿ⁻¹P₀ + (n-1)(1-t)ⁿ⁻²tP₁ + ... + tⁿ⁻¹Pₙ₋₁\n";
        formula += "where n = " + x.length + " (number of control points)";
    }
    else if (lastUsedMethod === 'all') {
        // Show all formulas for comparison
        formula += "=== ALL INTERPOLATION FORMULAS ===\n\n";
        
        // Lagrange Formula
        formula += "--- LAGRANGE FORMULA ---\n";
        formula += "P(x) = ";
        for (let i = 0; i < x.length; i++) {
            let term = y[i] + "";
            for (let j = 0; j < x.length; j++) {
                if (j !== i) term += `((x - ${x[j]})/(${x[i]} - ${x[j]}))`;
            }
            formula += (i !== 0 ? ' + ' : '') + term;
        }
        
        // Newton Divided Differences Formula
        formula += "\n\n--- NEWTON DIVIDED DIFFERENCES ---\n";
        const divTable = dividedDifferenceTable(x, y);
        formula += "P(x) = " + divTable[0][0];
        for (let i = 1; i < x.length; i++) {
            let term = ` + ${divTable[0][i]}`;
            for (let j = 0; j < i; j++) {
                term += `(x - ${x[j]})`;
            }
            formula += term;
        }
        
        // Newton Forward Formula
        formula += "\n\n--- NEWTON FORWARD DIFFERENCES ---\n";
        const h = x[1] - x[0];
        formula += `h = ${h}\n`;
        formula += "u = (x - x₀)/h = (x - " + x[0] + ")/" + h + "\n";
        formula += "P(x) = " + y[0];
        let diffTable = [...y];
        for (let i = 1; i < x.length; i++) {
            for (let j = 0; j < x.length - i; j++) {
                diffTable[j] = diffTable[j+1] - diffTable[j];
            }
            let term = ` + (${diffTable[0]}/${factorial(i)})`;
            for (let j = 0; j < i; j++) {
                term += `(u - ${j})`;
            }
            formula += term;
        }
        
        // Bezier Formula
        formula += "\n\n--- BEZIER INTERPOLATION ---\n";
        formula += "Using De Casteljau's algorithm:\n";
        formula += "t = (x - x_min) / (x_max - x_min)\n";
        formula += "Control Points: ";
        for (let i = 0; i < x.length; i++) {
            formula += `P${i}(${i/(x.length-1)}, ${y[i]})`;
            if (i < x.length - 1) formula += ", ";
        }
        formula += "\n\nBezier curve is calculated using recursive linear interpolation:\n";
        formula += "B(t) = (1-t)ⁿ⁻¹P₀ + (n-1)(1-t)ⁿ⁻²tP₁ + ... + tⁿ⁻¹Pₙ₋₁\n";
        formula += "where n = " + x.length + " (number of control points)";
    }
    
    document.getElementById('formulaBox').value = formula;
    document.getElementById('formulaBox').style.display = 'block';
    document.getElementById('dataTable').style.display = 'none';
}

function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

function exportCSV() {
    const { x, y } = getInputData();
    let csv = 'X,Y\n';
    x.forEach((val, i) => csv += `${val},${y[i]}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'interpolation_data.csv';
    link.click();
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Interpolation Data", 10, 10);
    const { x, y } = getInputData();
    x.forEach((val, i) => doc.text(`${val} , ${y[i]}`, 10, 20 + i * 10));
    doc.save('interpolation.pdf');
}

function downloadGraphs() {
    if (!chart || !errorChart) {
        alert("Please generate graphs first before downloading!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Get current method name for title
    let methodName = "Interpolation";
    if (lastUsedMethod === 'lagrange') methodName = "Lagrange";
    else if (lastUsedMethod === 'divided') methodName = "Newton Divided";
    else if (lastUsedMethod === 'forward') methodName = "Newton Forward";
    else if (lastUsedMethod === 'bezier') methodName = "Bezier";
    else if (lastUsedMethod === 'all') methodName = "All Methods";
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text(`${methodName} Interpolation Graphs`, 105, 20, { align: 'center' });
    
    // Add data points info
    const { x, y } = getInputData();
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Data Points: ${x.length} points`, 20, 35);
    doc.text(`X Range: ${Math.min(...x)} to ${Math.max(...x)}`, 20, 42);
    doc.text(`Y Range: ${Math.min(...y)} to ${Math.max(...y)}`, 20, 49);
    
    // Convert charts to images
    const chartCanvas = document.getElementById('chart');
    const errorCanvas = document.getElementById('errorChart');
    
    // Add main interpolation graph
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text("Interpolation Graph", 105, 70, { align: 'center' });
    
    const chartImage = chartCanvas.toDataURL('image/png');
    doc.addImage(chartImage, 'PNG', 20, 80, 170, 80);
    
    // Add error graph
    doc.setFontSize(16);
    doc.setTextColor(239, 68, 68); // Red color
    doc.text("Error Analysis Graph", 105, 180, { align: 'center' });
    
    const errorImage = errorCanvas.toDataURL('image/png');
    doc.addImage(errorImage, 'PNG', 20, 190, 170, 60);
    
    // Add legend and notes
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Generated by Interpolation Pro App", 20, 270);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 275);
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 280);
    
    // Save the PDF
    const filename = `interpolation_graphs_${methodName.toLowerCase().replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
}

document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n').filter(Boolean);
        const x = [], y = [];
        lines.slice(1).forEach(line => {
            const [xi, yi] = line.split(',').map(Number);
            x.push(xi);
            y.push(yi);
        });
        document.getElementById('xValues').value = x.join(', ');
        document.getElementById('yValues').value = y.join(', ');
    };
    reader.readAsText(file);
});
