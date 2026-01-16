import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";

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
      // Get user profile for personalized advice
      const profile = await db.getUserProfile(ctx.user.id);
      
      let systemPrompt = "你是一位专业的财务顾问助手。根据用户的消费数据和目标，提供简洁、实用的财务建议。建议应该具体、可执行，并且富有同理心。";
      
      if (profile) {
        systemPrompt += `\n\n用户背景：\n`;
        if (profile.city) systemPrompt += `- 地理位置：${profile.country || ''} ${profile.province || ''} ${profile.city}\n`;
        if (profile.identity) {
          const identityMap: Record<string, string> = {
            student: '学生',
            employee: '上班族',
            entrepreneur: '企业家',
            other: '其他'
          };
          systemPrompt += `- 身份：${identityMap[profile.identity] || profile.identity}\n`;
        }
        if (profile.goals) systemPrompt += `- 理想目标：${profile.goals}\n`;
        if (profile.incomeStructure) systemPrompt += `- 收入情况：${profile.incomeStructure}\n`;
        if (profile.expenseStructure) systemPrompt += `- 支出情况：${profile.expenseStructure}\n`;
      }

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.context },
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

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProfile(ctx.user.id);
    }),
    upsert: protectedProcedure.input(z.object({
      country: z.string().optional(),
      province: z.string().optional(),
      city: z.string().optional(),
      identity: z.enum(["student", "employee", "entrepreneur", "other"]).optional(),
      goals: z.string().optional(),
      incomeStructure: z.string().optional(),
      expenseStructure: z.string().optional(),
      existingAssets: z.string().optional(),
      isComplete: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.upsertUserProfile({
        userId: ctx.user.id,
        ...input,
      });
    }),
  }),

  chat: router({
    getMessages: protectedProcedure.input(z.object({
      type: z.enum(["profile_setup", "expense_consult", "general"]).optional(),
      limit: z.number().optional(),
    })).query(async ({ ctx, input }) => {
      return db.getChatMessages(ctx.user.id, input.type, input.limit);
    }),
    sendMessage: protectedProcedure.input(z.object({
      content: z.string(),
      type: z.enum(["profile_setup", "expense_consult", "general"]).default("general"),
    })).mutation(async ({ ctx, input }) => {
      // Save user message
      await db.createChatMessage({
        userId: ctx.user.id,
        role: "user",
        content: input.content,
        type: input.type,
      });

      // Get user profile for context
      const profile = await db.getUserProfile(ctx.user.id);
      
      // Build context based on message type
      let systemPrompt = "";
      if (input.type === "profile_setup") {
        systemPrompt = "你是一位专业的财务规划助手。请友好地引导用户完善他们的财务画像信息，包括地理位置、身份、收入支出结构、理想目标和现有资产等。每次只询问一个方面的信息，保持对话自然流畅。";
      } else if (input.type === "expense_consult") {
        systemPrompt = `你是一位专业的消费顾问。用户正在考虑一笔消费，请基于他们的财务状况提供建议。\n\n用户画像：${profile ? JSON.stringify(profile) : "暂无"}`;
      } else {
        systemPrompt = "你是一位专业的财务助手，帮助用户管理日常财务和实现储蓄目标。";
      }

      // Get AI response
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.content },
        ],
      });

      const aiContent = response.choices[0]?.message?.content || "抱歉，我暂时无法回答。";
      const aiContentStr = typeof aiContent === 'string' ? aiContent : JSON.stringify(aiContent);

      // Save AI response
      await db.createChatMessage({
        userId: ctx.user.id,
        role: "assistant",
        content: aiContentStr,
        type: input.type,
      });

      return { content: aiContentStr };
    }),
    clearMessages: protectedProcedure.input(z.object({
      type: z.enum(["profile_setup", "expense_consult", "general"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.clearChatMessages(ctx.user.id, input.type);
    }),
  }),
});

export type AppRouter = typeof appRouter;
