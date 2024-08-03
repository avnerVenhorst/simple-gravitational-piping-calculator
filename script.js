const manningCoefficients = {
    'צינור בטון חלק': 0.012,
    'צינור בטון גס': 0.016,
    'צינור פלדה': 0.012,
    'צינור PVC': 0.010,
    'צינור HDPE': 0.009,
    'תעלת בטון מחוספס': 0.017,
    'תעלת אדמה נקייה': 0.022,
    'תעלת אדמה עם צמחייה': 0.035
};

let detailedCalculations = "";

document.addEventListener('DOMContentLoaded', function() {
    const pipeTypeSelect = document.getElementById('pipeType');
    const manningCoefficientInput = document.getElementById('manningCoefficient');
    const calculateBtn = document.getElementById('calculateBtn');
    const showFormulaBtn = document.getElementById('showFormulaBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modal = document.getElementById('modal');

    // Populate pipe type select
    for (let type in manningCoefficients) {
        let option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        pipeTypeSelect.appendChild(option);
    }

    pipeTypeSelect.addEventListener('change', function() {
        manningCoefficientInput.value = manningCoefficients[this.value] || '';
    });

    calculateBtn.addEventListener('click', handleCalculate);
    showFormulaBtn.addEventListener('click', showModal);
    closeModalBtn.addEventListener('click', closeModal);

    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
});

function handleCalculate() {
    const pipeDiameter = parseFloat(document.getElementById('pipeDiameter').value);
    const pipeSlope = parseFloat(document.getElementById('pipeSlope').value);
    const manningCoefficient = parseFloat(document.getElementById('manningCoefficient').value);
    const flowRate = document.getElementById('flowRate').value ? parseFloat(document.getElementById('flowRate').value) : null;

    const pipeDiameterUnit = document.getElementById('pipeDiameterUnit').value;
    const pipeSlopeUnit = document.getElementById('pipeSlopeUnit').value;
    const flowRateUnit = document.getElementById('flowRateUnit').value;

    const result = calculateHydraulicProperties(pipeDiameter, pipeSlope, manningCoefficient, flowRate, pipeDiameterUnit, pipeSlopeUnit, flowRateUnit);

    displayResult(result);
}

function calculateHydraulicProperties(diameter, slope, manning, flowRate, diameterUnit, slopeUnit, flowRateUnit) {
    detailedCalculations = "חישובים מפורטים:\n\n";

    diameter = convertToBaseUnits(diameter, diameterUnit);
    slope = convertToBaseUnits(slope, slopeUnit);
    if (flowRate !== null) {
        flowRate = convertToBaseUnits(flowRate, flowRateUnit);
    }

    detailedCalculations += `קוטר הצינור: ${diameter.toFixed(4)} מטר\n`;
    detailedCalculations += `שיפוע הצינור: ${slope.toFixed(4)}\n`;
    detailedCalculations += `מקדם מאנינג: ${manning}\n`;
    if (flowRate !== null) detailedCalculations += `ספיקה: ${flowRate.toFixed(4)} מ"ק/שניה\n\n`;

    const area = Math.PI * (diameter / 2) ** 2;
    const perimeter = Math.PI * diameter;
    const fullFlowRate = (area ** (5/3) * slope ** 0.5) / (manning * perimeter ** (2/3));

    detailedCalculations += `שטח חתך מלא: ${area.toFixed(4)} מ"ר\n`;
    detailedCalculations += `היקף רטוב מלא: ${perimeter.toFixed(4)} מטר\n`;
    detailedCalculations += `ספיקה בזרימה מלאה: ${fullFlowRate.toFixed(4)} מ"ק/שניה\n\n`;

    let yD, QQf, velocity, actualFlowRate, flowDepth;

    if (flowRate !== null) {
        QQf = flowRate / fullFlowRate;
        detailedCalculations += `יחס ספיקה (Q/Qf): ${QQf.toFixed(4)}\n`;

        // Iterative method to find flow depth
        yD = 0.5;
        const epsilon = 0.0000001;
        let iteration = 0;
        while (true) {
            iteration++;
            const theta = 2 * Math.acos(1 - 2 * yD);
            const A = (diameter ** 2 / 8) * (theta - Math.sin(theta));
            const P = diameter * theta / 2;
            const R = A / P;
            const Q = (A ** (5/3) * slope ** 0.5) / (manning * P ** (2/3));
            if (Math.abs(Q - flowRate) < epsilon) break;
            yD += (flowRate - Q) / fullFlowRate * 0.1;
            yD = Math.max(0.0001, Math.min(0.9999, yD));
        }

        flowDepth = yD * diameter;
        const theta = 2 * Math.acos(1 - 2 * yD);
        const A = (diameter ** 2 / 8) * (theta - Math.sin(theta));
        velocity = flowRate / A;
        actualFlowRate = flowRate;

        detailedCalculations += `גובה זרימה: ${flowDepth.toFixed(4)} מטר\n`;
        detailedCalculations += `יחס מילוי (y/D): ${yD.toFixed(4)}\n`;
        detailedCalculations += `מהירות זרימה: ${velocity.toFixed(4)} מ'/שניה\n`;
        detailedCalculations += `מספר איטרציות: ${iteration}\n`;
    } else {
        // Calculate max flow at 80% filling
        yD = 0.8;
        flowDepth = yD * diameter;
        const theta = 2 * Math.acos(1 - 2 * yD);
        const A = (diameter ** 2 / 8) * (theta - Math.sin(theta));
        const P = diameter * theta / 2;
        actualFlowRate = (A ** (5/3) * slope ** 0.5) / (manning * P ** (2/3));
        QQf = actualFlowRate / fullFlowRate;
        velocity = actualFlowRate / A;

        detailedCalculations += `גובה זרימה מקסימלי (80%): ${flowDepth.toFixed(4)} מטר\n`;
        detailedCalculations += `יחס מילוי (y/D): 0.8000\n`;
        detailedCalculations += `ספיקה מקסימלית ב-80% מילוי: ${actualFlowRate.toFixed(4)} מ"ק/שניה\n`;
        detailedCalculations += `יחס ספיקה מקסימלי (Q/Qf): ${QQf.toFixed(4)}\n`;
        detailedCalculations += `מהירות זרימה מקסימלית: ${velocity.toFixed(4)} מ'/שניה\n`;
    }

    return { yD, QQf, velocity, flowRate: actualFlowRate, flowDepth, diameter, slope, manning };
}

function convertToBaseUnits(value, unit) {
    switch (unit) {
        case 'מ"מ': return value / 1000;
        case 'ס"מ': return value / 100;
        case 'מטר': return value;
        case '%': return value / 100;
        case 'ל/שניה': return value / 1000;
        case 'מ"ק/שעה': return value / 3600;
        case 'מ"ק/שניה': return value;
        default: return value;
    }
}

function displayResult(result) {
    const resultDiv = document.getElementById('result');
    const resultContent = document.getElementById('resultContent');
    const warningDiv = document.getElementById('warning');

    resultContent.innerHTML = `
        <div>יחס ספיקה (Q/Qf): ${result.QQf.toFixed(3)}</div>
        <div>יחס מילוי (y/D): ${result.yD.toFixed(3)}</div>
        <div>גובה זרימה: ${result.flowDepth.toFixed(3)} מטר</div>
        <div>מהירות זרימה: ${result.velocity.toFixed(3)} מ'/שניה</div>
        <div>ספיקה: ${result.flowRate.toFixed(3)} מ"ק/שניה</div>
    `;

    resultDiv.classList.remove('hidden');

    if (result.yD > 0.8) {
        warningDiv.textContent = "אזהרה: יחס המילוי (y/D) גבוה מ-80%. יש לשקול העלאת קוטר הצינור.";
        warningDiv.classList.remove('hidden');
    } else {
        warningDiv.classList.add('hidden');
    }
}

function showModal() {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');

    let content = `
        <h4>נוסחאות עיקריות:</h4>
        <ol>
            <li><strong>נוסחת מאנינג (Manning's Equation):</strong><br>V = (1/n) * R^(2/3) * S^(1/2)</li>
            <li><strong>חישוב ספיקה:</strong><br>Q = A * V</li>
            <li><strong>יחס ספיקה (Q/Qf):</strong><br>Q/Qf = ספיקה נוכחית / ספיקה בזרימה מלאה</li>
        </ol>
        <h4>טבלת מקדמי מאנינג:</h4>
        <table>
            <tr><th>סוג צינור/תעלה</th><th>מקדם מאנינג</th></tr>
    `;

    for (let type in manningCoefficients) {
        content += `<tr><td>${type}</td><td>${manningCoefficients[type]}</td></tr>`;
    }

    content += `
        </table>
        <p>מקור: ערכים טיפוסיים ממקורות הנדסיים מקובלים. לדיוק מרבי, יש להתייעץ עם מפרטי היצרן או לבצע מדידות בשטח.</p>
        <h4>חישובים מפורטים:</h4>
        <pre>${detailedCalculations}</pre>
    `;

    modalContent.innerHTML = content;
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
}
