const { preflight, ok, badRequest, serverError } = require('./_utils/response');

/**
 * POST /api/calculate-emi
 * Body: { principal, annualRate, tenureMonths }
 * Returns: { emi, totalPayable, totalInterest, amortizationSchedule (first 12 months) }
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return preflight();
    if (event.httpMethod !== 'POST') return badRequest('Method not allowed');

    try {
        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { return badRequest('Invalid JSON'); }

        const { principal, annualRate, tenureMonths } = body;

        if (!principal || isNaN(principal) || principal <= 0) return badRequest('principal must be a positive number');
        if (annualRate === undefined || isNaN(annualRate) || annualRate < 0) return badRequest('annualRate must be >= 0');
        if (!tenureMonths || isNaN(tenureMonths) || tenureMonths < 1) return badRequest('tenureMonths must be >= 1');

        const P = Number(principal);
        const n = Number(tenureMonths);
        const r = Number(annualRate) / 100 / 12; // monthly rate

        let emi;
        if (r === 0) {
            emi = P / n;
        } else {
            emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }

        const totalPayable = emi * n;
        const totalInterest = totalPayable - P;

        // Build first 12 months of amortization schedule
        const schedule = [];
        let balance = P;
        const scheduleMonths = Math.min(n, 12);

        for (let i = 1; i <= scheduleMonths; i++) {
            const interestComponent = balance * r;
            const principalComponent = emi - interestComponent;
            balance -= principalComponent;

            schedule.push({
                month: i,
                emi: Math.round(emi * 100) / 100,
                principal: Math.round(principalComponent * 100) / 100,
                interest: Math.round(interestComponent * 100) / 100,
                remainingBalance: Math.max(0, Math.round(balance * 100) / 100),
            });
        }

        return ok({
            emi: Math.round(emi * 100) / 100,
            totalPayable: Math.round(totalPayable * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            principal: P,
            annualRate: Number(annualRate),
            tenureMonths: n,
            amortizationSchedule: schedule,
        });
    } catch (err) {
        console.error('[calculate-emi]', err.message);
        return serverError();
    }
};
