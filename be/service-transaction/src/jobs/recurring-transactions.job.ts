import cron, { ScheduledTask } from 'node-cron';
import { RecurringRuleModel, type IRecurringRule } from '../models/recurring-rule.model';
import { transactionService } from '../services/transaction.service';

class RecurringTransactionsJob {
  private task: ScheduledTask | null = null;

  start() {
    if (this.task) return;

    const schedule = process.env.RECURRING_CRON_SCHEDULE ?? '5 0 * * *';
    const timezone = process.env.RECURRING_JOB_TIMEZONE ?? 'Asia/Ho_Chi_Minh';

    this.task = cron.schedule(
      schedule,
      () => {
        this.runOnce().catch((error) => {
          console.error('[recurring-job] runOnce failed:', error);
        });
      },
      {
        timezone,
      }
    );

    console.log(`[recurring-job] scheduled with pattern "${schedule}" (${timezone})`);
  }

  stop() {
    this.task?.stop();
    this.task?.destroy();
    this.task = null;
  }

  async runOnce(referenceDate = new Date()) {
    const todayKey = this.toDateKey(referenceDate);
    const rules = await RecurringRuleModel.find({ status: 'ACTIVE' }).lean<IRecurringRule[]>();
    let created = 0;

    for (const rule of rules) {
      if (!this.shouldRunToday(rule, referenceDate)) continue;
      if (rule.last_run_on === todayKey) continue;

      try {
        await transactionService.createTransaction({
          user_id: rule.user_id,
          wallet_id: rule.wallet_id,
          category_id: rule.category_id ?? null,
          amount: rule.amount?.toString?.() ?? '0',
          transaction_type: rule.transaction_type,
          currency: rule.currency ?? 'VND',
          description: rule.note ?? `Recurring ${rule.transaction_type.toLowerCase()} transaction`,
          occurred_at: referenceDate,
          idempotency_key: `recurring:${rule._id.toString()}:${todayKey}`,
          source: 'RECURRING',
        });

        await RecurringRuleModel.findByIdAndUpdate(rule._id, {
          $set: { last_run_on: todayKey },
        });

        created += 1;
      } catch (error: any) {
        if (error?.message === 'idempotency_key already exists') {
          await RecurringRuleModel.findByIdAndUpdate(rule._id, {
            $set: { last_run_on: todayKey },
          });
          continue;
        }

        console.error(`[recurring-job] failed for rule ${rule._id.toString()}:`, error);
      }
    }

    console.log(`[recurring-job] scanned ${rules.length} rule(s), created ${created} transaction(s)`);
    return { scanned: rules.length, created };
  }

  private shouldRunToday(
    rule: Pick<IRecurringRule, 'frequency' | 'day_of_week' | 'day_of_month'>,
    referenceDate: Date
  ) {
    if (rule.frequency === 'WEEKLY') {
      return referenceDate.getDay() === (rule.day_of_week ?? -1);
    }

    const lastDayOfMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0
    ).getDate();
    const targetDay = Math.min(rule.day_of_month ?? 1, lastDayOfMonth);

    return referenceDate.getDate() === targetDay;
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const recurringTransactionsJob = new RecurringTransactionsJob();
