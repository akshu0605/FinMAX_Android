const { preflight, ok, badRequest, serverError } = require('./_utils/response');

/**
 * POST /api/calculate-sip
 * Body: { monthlyAmount, annualRate, years }
 * Returns: { maturityAmount, totalInvested, estimatedReturns, monthByMonth (last 12) }
 *
 * SIP formula: M = P × [((1 + r)^n - 1) / r] × (1 + r)
 *   where P = monthly investment, r = monthly rate, n = total months
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'POST') return badRequest('Method not allowed');

    try {
        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { return badRequest('Invalid JSON'); }

        const { monthlyAmount, annualRate, years } = body;

        if (!monthlyAmount || isNaN(monthlyAmount) || monthlyAmount <= 0)
            return badRequest('monthlyAmount must be a positive number');
        if (annualRate === undefined || isNaN(annualRate) || annualRate < 0)
            return badRequest('annualRate must be >= 0');
        if (!years || isNaN(years) || years < 1)
            return badRequest('years must be >= 1');

        const P = Number(monthlyAmount);
        const r = Number(annualRate) / 100 / 12; // monthly rate
        const n = Number(years) * 12;            // total months

        let maturityAmount;
        if (r === 0) {
            maturityAmount = P * n;
        } else {
            maturityAmount = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        }

        const totalInvested = P * n;
        const estimatedReturns = maturityAmount - totalInvested;

        // Year-by-year growth breakdown
        const yearlyBreakdown = [];
        for (let y = 1; y <= Number(years); y++) {
            const months = y * 12;
            const value = r === 0
                ? P * months
                : P * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);

            yearlyBreakdown.push({
                year: y,
                invested: Math.round(P * months),
                totalValue: Math.round(value),
                returns: Math.round(value - P * months),
            });
        }

        return ok({
            monthlyAmount: P,
            annualRate: Number(annualRate),
            years: Number(years),
            totalMonths: n,
            maturityAmount: Math.round(maturityAmount),
            totalInvested: Math.round(totalInvested),
            estimatedReturns: Math.round(estimatedReturns),
            yearlyBreakdown,
        });
    } catch (err) {
        console.error('[calculate-sip]', err.message);
        return serverError();
    }
};
