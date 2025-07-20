import { match } from 'ts-pattern'
import { createMetricsService } from './metrics.service.js'

const metricsService = createMetricsService()

export type BusinessEvent =
  | {
      type: 'reservationCreated'
      salonId: string
      serviceType: string
      amount: number
    }
  | {
      type: 'reservationCancelled'
      salonId: string
      reason: 'customer_request' | 'salon_request' | 'no_show' | 'system'
    }
  | {
      type: 'userActivity'
      userType: 'customer' | 'salon_owner' | 'staff'
      action: 'login' | 'logout'
    }
  | {
      type: 'paymentReceived'
      salonId: string
      serviceType: string
      amountCents: number
    }
  | {
      type: 'serviceCompleted'
      salonId: string
      serviceType: string
      durationMinutes: number
    }
  | {
      type: 'reviewSubmitted'
      salonId: string
      rating: number
    }
  | {
      type: 'staffScheduleUpdate'
      salonId: string
      staffId: string
      utilizationRate: number
    }

export type BusinessMetricsService = {
  recordBusinessEvent: (event: BusinessEvent) => void
  calculateActiveUsers: (
    userType: 'customer' | 'salon_owner' | 'staff',
    count: number
  ) => void
  updateCustomerSatisfaction: (salonId: string, averageScore: number) => void
  updateStaffUtilization: (
    salonId: string,
    staffId: string,
    rate: number
  ) => void
}

export const createBusinessMetricsService = (): BusinessMetricsService => {
  const recordBusinessEvent = (event: BusinessEvent): void => {
    match(event)
      .with(
        { type: 'reservationCreated' },
        ({ salonId, serviceType, amount }) => {
          metricsService.business.reservationsTotal.inc({
            salon_id: salonId,
            service_type: serviceType,
          })
          metricsService.business.revenueTotal.inc(
            {
              salon_id: salonId,
              service_type: serviceType,
            },
            amount * 100
          ) // 円をセントに変換
        }
      )
      .with({ type: 'reservationCancelled' }, ({ salonId, reason }) => {
        metricsService.business.reservationsCancelled.inc({
          salon_id: salonId,
          reason,
        })
      })
      .with({ type: 'userActivity' }, ({ userType, action }) => {
        if (action === 'login') {
          metricsService.business.activeUsers.inc({ user_type: userType })
        } else if (action === 'logout') {
          metricsService.business.activeUsers.dec({ user_type: userType })
        }
      })
      .with(
        { type: 'paymentReceived' },
        ({ salonId, serviceType, amountCents }) => {
          metricsService.business.revenueTotal.inc(
            {
              salon_id: salonId,
              service_type: serviceType,
            },
            amountCents
          )
        }
      )
      .with(
        { type: 'serviceCompleted' },
        ({ salonId, serviceType, durationMinutes }) => {
          metricsService.business.averageServiceDuration.observe(
            {
              salon_id: salonId,
              service_type: serviceType,
            },
            durationMinutes
          )
        }
      )
      .with({ type: 'reviewSubmitted' }, () => {
        // レビューが投稿されたときは、別途平均値を計算して更新する必要がある
        // ここでは個別のレビューイベントを記録するのみ
      })
      .with(
        { type: 'staffScheduleUpdate' },
        ({ salonId, staffId, utilizationRate }) => {
          metricsService.business.staffUtilizationRate.set(
            {
              salon_id: salonId,
              staff_id: staffId,
            },
            utilizationRate
          )
        }
      )
      .exhaustive()
  }

  const calculateActiveUsers = (
    userType: 'customer' | 'salon_owner' | 'staff',
    count: number
  ): void => {
    metricsService.business.activeUsers.set({ user_type: userType }, count)
  }

  const updateCustomerSatisfaction = (
    salonId: string,
    averageScore: number
  ): void => {
    metricsService.business.customerSatisfactionScore.set(
      { salon_id: salonId },
      averageScore
    )
  }

  const updateStaffUtilization = (
    salonId: string,
    staffId: string,
    rate: number
  ): void => {
    metricsService.business.staffUtilizationRate.set(
      {
        salon_id: salonId,
        staff_id: staffId,
      },
      rate
    )
  }

  return {
    recordBusinessEvent,
    calculateActiveUsers,
    updateCustomerSatisfaction,
    updateStaffUtilization,
  }
}

// ユースケースでの使用例をエクスポート
export const businessMetricsUsageExample = {
  // 予約作成時
  onReservationCreated: (reservation: {
    salonId: string
    serviceType: string
    amount: number
  }) => {
    const service = createBusinessMetricsService()
    service.recordBusinessEvent({
      type: 'reservationCreated',
      salonId: reservation.salonId,
      serviceType: reservation.serviceType,
      amount: reservation.amount,
    })
  },

  // 予約キャンセル時
  onReservationCancelled: (
    salonId: string,
    reason: 'customer_request' | 'salon_request' | 'no_show' | 'system'
  ) => {
    const service = createBusinessMetricsService()
    service.recordBusinessEvent({
      type: 'reservationCancelled',
      salonId,
      reason,
    })
  },

  // サービス完了時
  onServiceCompleted: (
    salonId: string,
    serviceType: string,
    startTime: Date,
    endTime: Date
  ) => {
    const service = createBusinessMetricsService()
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 1000 / 60
    )
    service.recordBusinessEvent({
      type: 'serviceCompleted',
      salonId,
      serviceType,
      durationMinutes,
    })
  },

  // 定期的なメトリクス更新（cronジョブなどで実行）
  updateDailyMetrics: async (
    getActiveUserCounts: () => Promise<{
      customer: number
      salon_owner: number
      staff: number
    }>,
    getSalonSatisfactionScores: () => Promise<
      Array<{ salonId: string; averageScore: number }>
    >,
    getStaffUtilizationRates: () => Promise<
      Array<{ salonId: string; staffId: string; rate: number }>
    >
  ) => {
    const service = createBusinessMetricsService()

    // アクティブユーザー数の更新
    const userCounts = await getActiveUserCounts()
    service.calculateActiveUsers('customer', userCounts.customer)
    service.calculateActiveUsers('salon_owner', userCounts.salon_owner)
    service.calculateActiveUsers('staff', userCounts.staff)

    // 顧客満足度の更新
    const satisfactionScores = await getSalonSatisfactionScores()
    for (const { salonId, averageScore } of satisfactionScores) {
      service.updateCustomerSatisfaction(salonId, averageScore)
    }

    // スタッフ稼働率の更新
    const utilizationRates = await getStaffUtilizationRates()
    for (const { salonId, staffId, rate } of utilizationRates) {
      service.updateStaffUtilization(salonId, staffId, rate)
    }
  },
}
