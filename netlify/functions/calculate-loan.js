const { preflight, ok, badRequest, serverError } = require('./_utils/response');

/**
 * POST /api/calculate-loan
 * Body: { principal, annualRate, months, type: 'simple' | 'compound' }
 * Returns: { monthlyEMI, totalPayable, totalInterest }
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'POST') return badRequest('Method not allowed');

    try {
        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { return badRequest('Invalid JSON'); }

        const { principal, annualRate, months, type = 'compound' } = body;

        if (!principal || isNaN(principal) || principal <= 0) return badRequest('principal must be a positive number');
        if (!annualRate || isNaN(annualRate) || annualRate < 0) return badRequest('annualRate must be >= 0');
        if (!months || isNaN(months) || months < 1) return badRequest('months must be >= 1');

        const P = Number(principal);
        const n = Number(months);
        const annualR = Number(annualRate) / 100;

        let totalPayable, totalInterest, monthlyEMI;

        if (type === 'simple') {
            const ratePerMonth = annualR / 12;
            totalInterest = P * ratePerMonth * n;
            totalPayable = P + totalInterest;
            monthlyEMI = totalPayable / n;
        } else {
            // Compound (reducing balance EMI — standard banking formula)
            const r = annualR / 12;
            if (r === 0) {
                monthlyEMI = P / n;
                totalPayable = P;
                totalInterest = 0;
            } else {
                monthlyEMI = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                totalPayable = monthlyEMI * n;
                totalInterest = totalPayable - P;
            }
        }

        return ok({
            principal: Math.round(P),
            monthlyEMI: Math.round(monthlyEMI * 100) / 100,
            totalPayable: Math.round(totalPayable * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            months: n,
            type,
        });
    } catch (err) {
        console.error('[calculate-loan]', err.message);
        return serverError();
    }
};
