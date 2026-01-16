import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  goals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserGoals(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      targetAmount: z.string(),
      type: z.enum(["savings", "spending_limit"]),
      deadline: z.date().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createGoal({
        userId: ctx.user.id,
        ...input,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      targetAmount: z.string().optional(),
      currentAmount: z.string().optional(),
      deadline: z.date().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      status: z.enum(["active", "completed", "archived"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return db.updateGoal(id, ctx.user.id, updates);
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      return db.deleteGoal(input.id, ctx.user.id);
    }),
  }),

  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCategories(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      color: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createCategory({
        userId: ctx.user.id,
        ...input,
      });
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      return db.deleteCategory(input.id, ctx.user.id);
    }),
  }),

  expenses: router({
    list: protectedProcedure.input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })).query(async ({ ctx, input }) => {
      return db.getUserExpenses(ctx.user.id, input.startDate, input.endDate);
    }),
    create: protectedProcedure.input(z.object({
      categoryId: z.number(),
      amount: z.string(),
      description: z.string().optional(),
      date: z.date(),
    })).mutation(async ({ ctx, input }) => {
      return db.createExpense({
        userId: ctx.user.id,
        ...input,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      amount: z.string().optional(),
      description: z.string().optional(),
      date: z.date().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return db.updateExpense(id, ctx.user.id, updates);
    }),
    delete: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      return db.deleteExpense(input.id, ctx.user.id);
    }),
  }),

  insights: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserInsights(ctx.user.id);
    }),
    markAsRead: protectedProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ ctx, input }) => {
      return db.markInsightAsRead(input.id, ctx.user.id);
    }),
    generate: protectedProcedure.input(z.object({
      context: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          { 
            role: "system", 
            content: "你是一位专业的财务顾问助手。根据用户的消费数据和目标，提供简洁、实用的财务建议。建议应该具体、可执行，并且富有同理心。" 
          },
          { 
            role: "user", 
            content: input.context 
          },
        ],
      });
      
      const content = response.choices[0]?.message?.content || "暂时无法生成建议，请稍后再试。";
      
      return { content };
    }),
  }),

  stats: router({
    overview: protectedProcedure.input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    })).query(async ({ ctx, input }) => {
      const stats = await db.getExpenseStats(ctx.user.id, input.startDate, input.endDate);
      const byCategory = await db.getExpensesByCategory(ctx.user.id, input.startDate, input.endDate);
      
      return {
        total: stats?.total || "0",
        count: stats?.count || 0,
        byCategory,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
