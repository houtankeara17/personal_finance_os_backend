const Salary = require("../models/Salary");
const Bonus = require("../models/Bonus");
const Expense = require("../models/Expense");
const Remittance = require("../models/Remittance");
const Saving = require("../models/Saving");
const Plan = require("../models/Plan");

// ─── GET /api/dashboard ──────────────────────────────────────────────────────
// Query: ?year=2025&monthNumber=6
// Returns everything the dashboard needs in ONE request
const getDashboard = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const monthNumber =
      Number(req.query.monthNumber) || new Date().getMonth() + 1;
    const userId = req.user._id;

    const periodFilter = { userId, year, monthNumber };

    // ── Fetch all in parallel ────────────────────────────────────────────────
    const [salary, bonuses, expenses, remittances, savings, plans] =
      await Promise.all([
        Salary.findOne({ userId, year, monthNumber }),
        Bonus.find(periodFilter),
        Expense.find(periodFilter),
        Remittance.find(periodFilter),
        Saving.find(periodFilter),
        Plan.find({ userId }),
      ]);

    // ── Income ───────────────────────────────────────────────────────────────
    const salaryUSD = salary?.amountUSD || 0;
    const bonusTotalUSD = bonuses.reduce((s, r) => s + r.amountUSD, 0);
    const totalIncomeUSD = salaryUSD + bonusTotalUSD;

    // ── Deductions ───────────────────────────────────────────────────────────
    const remittanceTotalUSD = remittances.reduce((s, r) => s + r.amountUSD, 0);
    const savingTotalUSD = savings.reduce((s, r) => s + r.amountUSD, 0);
    const totalDeductionsUSD = remittanceTotalUSD + savingTotalUSD;

    // ── Spendable ────────────────────────────────────────────────────────────
    const netSpendable = totalIncomeUSD - totalDeductionsUSD;

    // ── Expenses ─────────────────────────────────────────────────────────────
    const totalSpent = expenses.reduce((s, r) => s + r.amountUSD, 0);
    const remaining = netSpendable - totalSpent;

    // ── Daily burn rate ───────────────────────────────────────────────────────
    const today = new Date();
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const daysPassed =
      year === today.getFullYear() && monthNumber === today.getMonth() + 1
        ? today.getDate()
        : daysInMonth;
    const daysLeft = daysInMonth - daysPassed;
    const dailyBurnActual = daysPassed > 0 ? totalSpent / daysPassed : 0;
    const dailyBudget = daysInMonth > 0 ? netSpendable / daysInMonth : 0;
    const dailyRemaining = daysLeft > 0 ? remaining / daysLeft : 0;

    // ── Spending by category ─────────────────────────────────────────────────
    const categoryTotals = expenses.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + r.amountUSD;
      return acc;
    }, {});
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, total]) => ({
        name,
        total: +total.toFixed(2),
        percentage:
          totalSpent > 0 ? +((total / totalSpent) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── Weekly pattern ───────────────────────────────────────────────────────
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyRaw = expenses.reduce((acc, r) => {
      const d = r.dayOfWeek ?? 0;
      acc[d] = (acc[d] || 0) + r.amountUSD;
      return acc;
    }, {});
    const weeklyPattern = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      day: DAY_NAMES[i],
      total: +(weeklyRaw[i] || 0).toFixed(2),
    }));

    // ── Plans overview ───────────────────────────────────────────────────────
    const plansOverview = plans.map((p) => ({
      _id: p._id,
      title: p.title,
      status: p.status,
      priority: p.priority,
      targetAmountUSD: p.targetAmountUSD,
      currentFunding: p.currentFunding,
      progress:
        p.targetAmountUSD > 0
          ? +((p.currentFunding / p.targetAmountUSD) * 100).toFixed(1)
          : 0,
      coverImage: p.images?.[0] || "",
    }));

    // ── Calendar daily totals ────────────────────────────────────────────────
    const dailyTotals = expenses.reduce((acc, r) => {
      acc[r.day] = (acc[r.day] || 0) + r.amountUSD;
      return acc;
    }, {});

    res.json({
      success: true,
      period: { year, monthNumber },
      kpis: {
        salary: +salaryUSD.toFixed(2),
        bonus: +bonusTotalUSD.toFixed(2),
        totalIncome: +totalIncomeUSD.toFixed(2),
        remittance: +remittanceTotalUSD.toFixed(2),
        saving: +savingTotalUSD.toFixed(2),
        totalDeductions: +totalDeductionsUSD.toFixed(2),
        netSpendable: +netSpendable.toFixed(2),
        totalSpent: +totalSpent.toFixed(2),
        remaining: +remaining.toFixed(2),
      },
      burnRate: {
        daysInMonth,
        daysPassed,
        daysLeft,
        dailyBurnActual: +dailyBurnActual.toFixed(2),
        dailyBudget: +dailyBudget.toFixed(2),
        dailyRemaining: +dailyRemaining.toFixed(2),
        spentProgress:
          netSpendable > 0
            ? +((totalSpent / netSpendable) * 100).toFixed(1)
            : 0,
      },
      categoryBreakdown,
      weeklyPattern,
      plansOverview,
      dailyTotals, // { "1": 12.50, "5": 8.00, ... } keyed by day number
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/dashboard/yearly ───────────────────────────────────────────────
// Year-level summary — all 12 months in one response (for yearly calendar/chart)
const getYearlySummary = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const userId = req.user._id;

    const [salaries, bonuses, expenses, remittances, savings] =
      await Promise.all([
        Salary.find({ userId, year }),
        Bonus.find({ userId, year }),
        Expense.find({ userId, year }),
        Remittance.find({ userId, year }),
        Saving.find({ userId, year }),
      ]);

    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const salary = salaries.find((r) => r.monthNumber === m)?.amountUSD || 0;
      const bonus = bonuses
        .filter((r) => r.monthNumber === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const spent = expenses
        .filter((r) => r.monthNumber === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const remittance = remittances
        .filter((r) => r.monthNumber === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const saving = savings
        .filter((r) => r.monthNumber === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const netSpendable = salary + bonus - remittance - saving;
      const remaining = netSpendable - spent;

      return {
        month: m,
        salary,
        bonus,
        spent,
        remittance,
        saving,
        netSpendable,
        remaining,
      };
    });

    const yearTotals = months.reduce(
      (acc, m) => {
        acc.salary += m.salary;
        acc.bonus += m.bonus;
        acc.spent += m.spent;
        acc.remittance += m.remittance;
        acc.saving += m.saving;
        acc.remaining += m.remaining;
        return acc;
      },
      { salary: 0, bonus: 0, spent: 0, remittance: 0, saving: 0, remaining: 0 },
    );

    res.json({ success: true, year, months, yearTotals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboard, getYearlySummary };
