import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, lte, gte } from 'drizzle-orm';
import {
  charges,
  payments,
  reservations,
  folios,
  auditRuns,
  properties,
  rooms,
} from '@haip/database';
import { DRIZZLE } from '../../database/database.module';

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Daily Revenue Report — sums charges by type and payments by method for a date.
   */
  async getDailyRevenue(propertyId: string, date: string) {
    // Revenue by charge type
    const revenueByType = await this.db
      .select({
        type: charges.type,
        total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.propertyId, propertyId),
          eq(charges.isReversal, false),
          sql`${charges.serviceDate}::date = ${date}`,
        ),
      )
      .groupBy(charges.type);

    // Adjustments (reversals)
    const [adjResult] = await this.db
      .select({
        total: sql<string>`coalesce(sum(abs(${charges.amount}::numeric)), 0)`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.propertyId, propertyId),
          eq(charges.isReversal, true),
          sql`${charges.serviceDate}::date = ${date}`,
        ),
      );

    // Payments by method
    const paymentsByMethod = await this.db
      .select({
        method: payments.method,
        total: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.propertyId, propertyId),
          eq(payments.status, 'captured' as any),
          sql`${payments.processedAt}::date = ${date}`,
        ),
      )
      .groupBy(payments.method);

    // Build revenue object
    const revenue = { room: 0, tax: 0, foodBeverage: 0, other: 0, total: 0 };
    for (const row of revenueByType) {
      const amount = parseFloat(row.total);
      if (row.type === 'room') revenue.room += amount;
      else if (row.type === 'tax') revenue.tax += amount;
      else if (row.type === 'food_beverage') revenue.foodBeverage += amount;
      else revenue.other += amount;
      revenue.total += amount;
    }

    // Build payments object
    const paymentsObj: Record<string, number> = {};
    let paymentsTotal = 0;
    for (const row of paymentsByMethod) {
      const amount = parseFloat(row.total);
      paymentsObj[row.method] = amount;
      paymentsTotal += amount;
    }

    const adjustments = parseFloat(adjResult?.total ?? '0');

    return {
      date,
      revenue,
      payments: { ...paymentsObj, total: paymentsTotal },
      adjustments,
      netRevenue: revenue.total - adjustments,
    };
  }

  /**
   * Occupancy Report — room occupancy metrics for a date (KB 5.9).
   */
  async getOccupancy(propertyId: string, date: string) {
    // Property total rooms
    const [property] = await this.db
      .select({ totalRooms: properties.totalRooms })
      .from(properties)
      .where(eq(properties.id, propertyId));
    const totalRooms = property?.totalRooms ?? 0;

    // Room status counts
    const roomStatusCounts = await this.db
      .select({
        status: rooms.status,
        count: sql<number>`count(*)::int`,
      })
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.isActive, true)))
      .groupBy(rooms.status);

    let outOfOrder = 0;
    let outOfService = 0;
    let occupiedRooms = 0;
    for (const row of roomStatusCounts) {
      if (row.status === 'out_of_order') outOfOrder = row.count;
      else if (row.status === 'out_of_service') outOfService = row.count;
      else if (row.status === 'occupied') occupiedRooms = row.count;
    }

    const availableRooms = totalRooms - outOfOrder - outOfService;
    const occupancyRate = availableRooms > 0 ? occupiedRooms / availableRooms : 0;

    // Arrivals (checked in today)
    const [arrivalsResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, propertyId),
          sql`${reservations.checkedInAt}::date = ${date}`,
        ),
      );

    // Departures (checked out today)
    const [departuresResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, propertyId),
          sql`${reservations.checkedOutAt}::date = ${date}`,
        ),
      );

    // Stayovers (in-house continuing)
    const [stayoversResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, propertyId),
          sql`${reservations.status} in ('stayover', 'checked_in', 'due_out')`,
          lte(reservations.arrivalDate, date),
        ),
      );

    // No-shows
    const [noShowsResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, propertyId),
          eq(reservations.status, 'no_show' as any),
          eq(reservations.arrivalDate, date),
        ),
      );

    // Cancellations
    const [cancelsResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, propertyId),
          eq(reservations.status, 'cancelled' as any),
          sql`${reservations.cancelledAt}::date = ${date}`,
        ),
      );

    return {
      date,
      totalRooms,
      outOfOrder,
      outOfService,
      availableRooms,
      occupiedRooms,
      occupancyRate: Math.round(occupancyRate * 10000) / 10000,
      occupancyPercent: `${(occupancyRate * 100).toFixed(1)}%`,
      arrivals: arrivalsResult?.count ?? 0,
      departures: departuresResult?.count ?? 0,
      stayovers: stayoversResult?.count ?? 0,
      noShows: noShowsResult?.count ?? 0,
      cancellations: cancelsResult?.count ?? 0,
    };
  }

  /**
   * Financial Summary (Manager's Report) — daily KPIs (KB 5.9).
   * ADR = room revenue / rooms sold
   * RevPAR = ADR x occupancy rate
   */
  async getFinancialSummary(propertyId: string, date: string) {
    // Room revenue
    const [roomRevenueResult] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.propertyId, propertyId),
          eq(charges.type, 'room' as any),
          eq(charges.isReversal, false),
          sql`${charges.serviceDate}::date = ${date}`,
        ),
      );
    const roomRevenue = parseFloat(roomRevenueResult?.total ?? '0');

    // Total revenue
    const [totalRevenueResult] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.propertyId, propertyId),
          eq(charges.isReversal, false),
          sql`${charges.serviceDate}::date = ${date}`,
        ),
      );
    const totalRevenue = parseFloat(totalRevenueResult?.total ?? '0');

    // Revenue by type
    const revenueByTypeRows = await this.db
      .select({
        type: charges.type,
        total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.propertyId, propertyId),
          eq(charges.isReversal, false),
          sql`${charges.serviceDate}::date = ${date}`,
        ),
      )
      .groupBy(charges.type);

    const revenueByType: Record<string, number> = {};
    for (const row of revenueByTypeRows) {
      revenueByType[row.type] = parseFloat(row.total);
    }

    // Payments by method
    const paymentRows = await this.db
      .select({
        method: payments.method,
        total: sql<string>`coalesce(sum(${payments.amount}::numeric), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.propertyId, propertyId),
          eq(payments.status, 'captured' as any),
          sql`${payments.processedAt}::date = ${date}`,
        ),
      )
      .groupBy(payments.method);

    const paymentsByMethod: Record<string, number> = {};
    for (const row of paymentRows) {
      paymentsByMethod[row.method] = parseFloat(row.total);
    }

    // Rooms sold
    const [roomsSoldResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.propertyId, propertyId),
          sql`${reservations.status} in ('checked_in', 'stayover', 'due_out')`,
          lte(reservations.arrivalDate, date),
        ),
      );
    const roomsSold = roomsSoldResult?.count ?? 0;

    // Property totals + OOO/OOS
    const [property] = await this.db
      .select({ totalRooms: properties.totalRooms })
      .from(properties)
      .where(eq(properties.id, propertyId));
    const totalRooms = property?.totalRooms ?? 0;

    const roomStatusCounts = await this.db
      .select({
        status: rooms.status,
        count: sql<number>`count(*)::int`,
      })
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.isActive, true)))
      .groupBy(rooms.status);

    let unavailableRooms = 0;
    for (const row of roomStatusCounts) {
      if (row.status === 'out_of_order' || row.status === 'out_of_service') {
        unavailableRooms += row.count;
      }
    }

    const availableRooms = totalRooms - unavailableRooms;
    const occupancyRate = availableRooms > 0 ? roomsSold / availableRooms : 0;
    const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
    const revpar = adr * occupancyRate;

    // Outstanding balances
    const [outstandingResult] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        totalBalance: sql<string>`coalesce(sum(${folios.balance}::numeric), 0)`,
      })
      .from(folios)
      .where(
        and(
          eq(folios.propertyId, propertyId),
          eq(folios.status, 'open' as any),
        ),
      );

    // Last audit
    const [lastAudit] = await this.db
      .select()
      .from(auditRuns)
      .where(eq(auditRuns.propertyId, propertyId))
      .orderBy(sql`${auditRuns.businessDate} desc`)
      .limit(1);

    return {
      date,
      kpis: {
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100,
        occupancyRate: Math.round(occupancyRate * 10000) / 10000,
        totalRevenue,
        roomRevenue,
      },
      revenueByType,
      paymentsByMethod,
      outstandingBalances: {
        totalFoliosOpen: outstandingResult?.count ?? 0,
        totalBalanceDue: parseFloat(outstandingResult?.totalBalance ?? '0'),
      },
      auditStatus: {
        lastAuditDate: lastAudit?.businessDate ?? null,
        lastAuditStatus: lastAudit?.status ?? null,
        errorsInLastAudit: lastAudit?.errors?.length ?? 0,
      },
    };
  }

  /**
   * Occupancy Trend Report — daily metrics over a date range (KB 5.9).
   */
  async getOccupancyTrend(propertyId: string, startDate: string, endDate: string) {
    // Property info
    const [property] = await this.db
      .select({ totalRooms: properties.totalRooms })
      .from(properties)
      .where(eq(properties.id, propertyId));
    const totalRooms = property?.totalRooms ?? 0;

    // OOO/OOS (snapshot — same for all dates in MVP)
    const roomStatusCounts = await this.db
      .select({
        status: rooms.status,
        count: sql<number>`count(*)::int`,
      })
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.isActive, true)))
      .groupBy(rooms.status);

    let unavailableRooms = 0;
    for (const row of roomStatusCounts) {
      if (row.status === 'out_of_order' || row.status === 'out_of_service') {
        unavailableRooms += row.count;
      }
    }
    const availableRooms = totalRooms - unavailableRooms;

    // Room revenue per day
    const dailyRevenue = await this.db
      .select({
        date: sql<string>`${charges.serviceDate}::date`,
        revenue: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.propertyId, propertyId),
          eq(charges.type, 'room' as any),
          eq(charges.isReversal, false),
          sql`${charges.serviceDate}::date >= ${startDate}`,
          sql`${charges.serviceDate}::date <= ${endDate}`,
        ),
      )
      .groupBy(sql`${charges.serviceDate}::date`);

    // Rooms sold per day (reservations in-house for each date)
    const dailyRoomsSold = await this.db
      .select({
        date: sql<string>`d.d::date`,
        count: sql<number>`count(distinct r.id)::int`,
      })
      .from(sql`generate_series(${startDate}::date, ${endDate}::date, '1 day'::interval) as d(d)`)
      .leftJoin(
        reservations,
        and(
          eq(reservations.propertyId, propertyId),
          sql`${reservations.status} in ('checked_in', 'stayover', 'due_out', 'checked_out')`,
          lte(reservations.arrivalDate, sql`d.d::date`),
          sql`${reservations.departureDate} > d.d::date`,
        ),
      )
      .groupBy(sql`d.d::date`)
      .orderBy(sql`d.d::date`);

    // Build lookup maps
    const revenueMap = new Map<string, number>();
    for (const row of dailyRevenue) {
      const dateKey = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0]!;
      revenueMap.set(dateKey, parseFloat(row.revenue));
    }

    // Build daily array
    const daily: Array<{
      date: string;
      occupancyRate: number;
      adr: number;
      revpar: number;
      roomsSold: number;
      revenue: number;
    }> = [];

    let totalRevenue = 0;
    let totalRoomNights = 0;

    for (const row of dailyRoomsSold) {
      const dateKey = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString().split('T')[0]!;
      const roomsSold = row.count;
      const revenue = revenueMap.get(dateKey) ?? 0;
      const occupancyRate = availableRooms > 0 ? roomsSold / availableRooms : 0;
      const adr = roomsSold > 0 ? revenue / roomsSold : 0;
      const revpar = adr * occupancyRate;

      daily.push({
        date: dateKey,
        occupancyRate: Math.round(occupancyRate * 10000) / 10000,
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100,
        roomsSold,
        revenue,
      });

      totalRevenue += revenue;
      totalRoomNights += roomsSold;
    }

    const dayCount = daily.length || 1;

    return {
      period: { start: startDate, end: endDate },
      daily,
      summary: {
        avgOccupancy: Math.round(daily.reduce((s, d) => s + d.occupancyRate, 0) / dayCount * 10000) / 10000,
        avgAdr: Math.round(daily.reduce((s, d) => s + d.adr, 0) / dayCount * 100) / 100,
        avgRevpar: Math.round(daily.reduce((s, d) => s + d.revpar, 0) / dayCount * 100) / 100,
        totalRevenue,
        totalRoomNights,
      },
    };
  }
}
