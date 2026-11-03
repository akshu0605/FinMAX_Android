/**
 * Debt Simplification Algorithm
 * Minimises the number of transactions needed to settle all debts in a group.
 */
//
// Input:  BalanceEntry[] — each user's net balance
// Output: Transaction[] — who pays whom and how much (minimal set)
//
// Algorithm: Greedy matching of largest debtor with largest creditor

export interface Transaction {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
}

interface Participant {
    userId: string;
    displayName: string;
    balance: number; // positive = creditor, negative = debtor
}

export function simplifyDebts(
    balances: { userId: string; displayName: string; netBalance: number }[],
): Transaction[] {
    const EPSILON = 0.01; // ignore tiny rounding differences
    const transactions: Transaction[] = [];

    // Deep copy and filter out near-zero balances
    const participants: Participant[] = balances
        .map(b => ({ userId: b.userId, displayName: b.displayName, balance: b.netBalance }))
        .filter(p => Math.abs(p.balance) > EPSILON);

    // Greedy loop: match largest creditor with largest debtor
    while (participants.length >= 2) {
        // Sort: highest balance first (creditors at front), lowest last (debtors at end)
        participants.sort((a, b) => b.balance - a.balance);

        const creditor = participants[0]; // owes most
        const debtor = participants[participants.length - 1]; // owes most to group

        if (creditor.balance <= EPSILON || debtor.balance >= -EPSILON) break;

        const amount = Math.min(creditor.balance, -debtor.balance);
        const rounded = Math.round(amount * 100) / 100;

        transactions.push({
            from: debtor.userId,
            fromName: debtor.displayName,
            to: creditor.userId,
            toName: creditor.displayName,
            amount: rounded,
        });

        creditor.balance -= amount;
        debtor.balance += amount;

        // Remove settled participants
        const toRemove: number[] = [];
        participants.forEach((p, i) => {
            if (Math.abs(p.balance) <= EPSILON) toRemove.push(i);
        });
        for (let i = toRemove.length - 1; i >= 0; i--) {
            participants.splice(toRemove[i], 1);
        }
    }

    return transactions;
}
