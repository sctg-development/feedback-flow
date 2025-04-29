/**
 * MongoDB implementation of FeedbackFlowDB using Prisma ORM
 */
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import {
  Feedback,
  IdMapping,
  Publication,
  Purchase,
  Refund,
  Tester,
} from '../types/data';

import {
  DEFAULT_PAGINATION,
  FeedbackFlowDB,
  FeedbacksRepository,
  IdMappingsRepository,
  PaginatedResult,
  PublicationsRepository,
  PurchasesRepository,
  PurchaseStatus,
  PurchaseStatusResponse,
  PurchaseWithFeedback,
  RefundsRepository,
  TestersRepository,
} from './db';

/**
 * MongoDB implementation of FeedbackFlowDB using Prisma ORM
 */
export class PrismaMongoDbDB implements FeedbackFlowDB {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.initialize();
  }

  /**
   * Initialize the database
   * Sets up any necessary connections or configurations
   */
  private async initialize(): Promise<void> {
    try {
      // Check schema version and run migrations if needed
      await this.ensureSchemaVersion();
      console.log('MongoDB connection initialized');
    } catch (error) {
      console.error('Error initializing MongoDB connection:', error);
    }
  }

  /**
   * Ensure the schema version is up to date
   */
  private async ensureSchemaVersion(): Promise<void> {
    try {
      // Check if schema version exists
      const schemaVersion = await this.prisma.schemaVersion.findUnique({
        where: { id: 1 },
      });
      
      // If no schema version exists, create it
      if (!schemaVersion) {
        await this.prisma.schemaVersion.create({
          data: {
            id: 1,
            version: 2, // Current schema version with screenshotSummary field
            description: 'Initial schema with screenshotSummary and transactionId support',
          },
        });
      } else if (schemaVersion.version < 2) {
        // Update schema version if needed
        await this.prisma.schemaVersion.update({
          where: { id: 1 },
          data: {
            version: 2,
            description: 'Updated schema with screenshotSummary field',
          },
        });
      }
    } catch (error) {
      console.error('Error ensuring schema version:', error);
    }
  }

  /**
   * ID mappings operations
   */
  idMappings: IdMappingsRepository = {
    exists: async (id: string): Promise<boolean> => {
      const count = await this.prisma.idMapping.count({
        where: { externalId: id },
      });
      return count > 0;
    },

    existsMultiple: async (ids: string[]): Promise<string[]> => {
      if (ids.length === 0) return [];

      const existingMappings = await this.prisma.idMapping.findMany({
        where: {
          externalId: { in: ids },
        },
        select: { externalId: true },
      });

      return existingMappings.map((mapping) => mapping.externalId);
    },

    getTesterUuid: async (id: string): Promise<string | undefined> => {
      const mapping = await this.prisma.idMapping.findUnique({
        where: { externalId: id },
        select: { testerUuid: true },
      });

      return mapping?.testerUuid;
    },

    put: async (id: string, testerUuid: string): Promise<boolean> => {
      try {
        await this.prisma.idMapping.create({
          data: {
            externalId: id,
            testerUuid,
          },
        });
        return true;
      } catch (error) {
        console.error('Error adding ID mapping:', error);
        return false;
      }
    },

    putMultiple: async (
      ids: string[],
      testerUuid: string,
    ): Promise<string[]> => {
      if (ids.length === 0) return [];

      const addedIds: string[] = [];

      for (const id of ids) {
        try {
          await this.prisma.idMapping.create({
            data: {
              externalId: id,
              testerUuid,
            },
          });
          addedIds.push(id);
        } catch (error) {
          console.error(`Error adding ID ${id}:`, error);
        }
      }

      return addedIds;
    },

    delete: async (id: string): Promise<boolean> => {
      try {
        await this.prisma.idMapping.delete({
          where: { externalId: id },
        });
        return true;
      } catch (error) {
        console.error('Error deleting ID mapping:', error);
        return false;
      }
    },

    getAll: async (): Promise<IdMapping[]> => {
      const mappings = await this.prisma.idMapping.findMany();
      
      return mappings.map((mapping) => ({
        id: mapping.externalId,
        testerUuid: mapping.testerUuid,
        created_at: mapping.createdAt.toISOString(),
      }));
    },
  };

  /**
   * Tester-related database operations
   */
  testers: TestersRepository = {
    find: async (
      fn: (tester: Tester) => boolean,
    ): Promise<Tester | undefined> => {
      const testers = await this.getAllTesters();
      return testers.find(fn);
    },

    filter: async (fn: (tester: Tester) => boolean): Promise<Tester[]> => {
      const testers = await this.getAllTesters();
      return testers.filter(fn);
    },

    put: async (newTester: Tester): Promise<string[]> => {
      const uuid = newTester.uuid || uuidv4();
      
      try {
        // Use upsert to handle both create and update scenarios
        await this.prisma.tester.upsert({
          where: { uuid },
          update: { name: newTester.name },
          create: {
            uuid,
            name: newTester.name,
          },
        });
        
        // Handle ID mappings
        const existingIds = await this.prisma.idMapping.findMany({
          where: { testerUuid: uuid },
          select: { externalId: true },
        });
        
        const existingIdSet = new Set(existingIds.map(id => id.externalId));
        
        // Remove IDs that are no longer associated with this tester
        for (const id of existingIdSet) {
          if (!newTester.ids.includes(id)) {
            await this.prisma.idMapping.delete({
              where: { externalId: id },
            });
          }
        }
        
        // Add new IDs
        for (const id of newTester.ids) {
          if (!existingIdSet.has(id)) {
            try {
              await this.prisma.idMapping.create({
                data: {
                  externalId: id,
                  testerUuid: uuid,
                },
              });
            } catch (error) {
              // ID might already exist, ignore errors
              console.error(`Error adding ID ${id}:`, error);
            }
          }
        }
        
        return newTester.ids;
      } catch (error) {
        console.error('Error adding/updating tester:', error);
        throw error;
      }
    },

    getAll: async (): Promise<Tester[]> => {
      return this.getAllTesters();
    },

    getTesterWithId: async (id: string): Promise<Tester | undefined> => {
      const mapping = await this.prisma.idMapping.findUnique({
        where: { externalId: id },
        include: { tester: true },
      });
      
      if (!mapping) return undefined;
      
      const idMappings = await this.prisma.idMapping.findMany({
        where: { testerUuid: mapping.testerUuid },
      });
      
      return {
        uuid: mapping.tester.uuid,
        name: mapping.tester.name,
        ids: idMappings.map(m => m.externalId),
        created_at: mapping.tester.createdAt.toISOString(),
        updated_at: mapping.tester.updatedAt.toISOString(),
      };
    },

    getTesterWithUuid: async (uuid: string): Promise<Tester | undefined> => {
      const tester = await this.prisma.tester.findUnique({
        where: { uuid },
      });
      
      if (!tester) return undefined;
      
      const idMappings = await this.prisma.idMapping.findMany({
        where: { testerUuid: uuid },
      });
      
      return {
        uuid: tester.uuid,
        name: tester.name,
        ids: idMappings.map(m => m.externalId),
        created_at: tester.createdAt.toISOString(),
        updated_at: tester.updatedAt.toISOString(),
      };
    },

    addIds: async (
      uuid: string,
      ids: string[],
    ): Promise<string[] | undefined> => {
      // Check if tester exists
      const tester = await this.prisma.tester.findUnique({
        where: { uuid },
      });
      
      if (!tester) return undefined;
      
      // Add new IDs
      const addedIds: string[] = [];
      
      for (const id of ids) {
        try {
          await this.prisma.idMapping.create({
            data: {
              externalId: id,
              testerUuid: uuid,
            },
          });
          addedIds.push(id);
        } catch (error) {
          // This ID probably already exists, skip it
          console.error(`Error adding ID ${id}:`, error);
        }
      }
      
      // Get all IDs for this tester
      const allIdMappings = await this.prisma.idMapping.findMany({
        where: { testerUuid: uuid },
      });
      
      return allIdMappings.map(m => m.externalId);
    },
  };

  /**
   * Purchase-related database operations
   */
  purchases: PurchasesRepository = {
    find: async (
      fn: (purchase: Purchase) => boolean,
    ): Promise<Purchase | undefined> => {
      const purchases = await this.getAllPurchases();
      return purchases.find(fn);
    },
    
    refunded: async (testerUuid: string, pagination?: typeof DEFAULT_PAGINATION): Promise<PaginatedResult<Purchase>> => {
      if (!pagination) {
        pagination = DEFAULT_PAGINATION;
      }
      
      // Get total count
      const totalCount = await this.prisma.purchase.count({
        where: { testerUuid, refunded: true },
      });
      
      // Get paginated results
      const purchases = await this.prisma.purchase.findMany({
        where: { testerUuid, refunded: true },
        orderBy: pagination.sort === 'order' 
          ? { orderNumber: pagination.order === 'asc' ? 'asc' : 'desc' }
          : { date: pagination.order === 'asc' ? 'asc' : 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        limit: pagination.limit,
      });
      
      // Map to Purchase interface
      const results = purchases.map(p => ({
        id: p.uuid,
        testerUuid: p.testerUuid,
        date: p.date.toISOString().split('T')[0],
        order: p.orderNumber,
        description: p.description,
        amount: p.amount,
        screenshot: p.screenshot,
        screenshotSummary: p.screenshotSummary || undefined,
        refunded: p.refunded,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      }));
      
      return { results, totalCount };
    },
    
    refundedAmount: async (testerUuid: string): Promise<number> => {
      const result = await this.prisma.purchase.aggregate({
        where: { testerUuid, refunded: true },
        _sum: { amount: true },
      });
      
      return result._sum.amount || 0;
    },
    
    notRefunded: async (testerUuid: string, pagination?: typeof DEFAULT_PAGINATION): Promise<PaginatedResult<Purchase>> => {
      if (!pagination) {
        pagination = DEFAULT_PAGINATION;
      }
      
      // Get total count
      const totalCount = await this.prisma.purchase.count({
        where: { testerUuid, refunded: false },
      });
      
      // Get paginated results
      const purchases = await this.prisma.purchase.findMany({
        where: { testerUuid, refunded: false },
        orderBy: pagination.sort === 'order' 
          ? { orderNumber: pagination.order === 'asc' ? 'asc' : 'desc' }
          : { date: pagination.order === 'asc' ? 'asc' : 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });
      
      // Map to Purchase interface
      const results = purchases.map(p => ({
        id: p.uuid,
        testerUuid: p.testerUuid,
        date: p.date.toISOString().split('T')[0],
        order: p.orderNumber,
        description: p.description,
        amount: p.amount,
        screenshot: p.screenshot,
        screenshotSummary: p.screenshotSummary || undefined,
        refunded: p.refunded,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      }));
      
      return { results, totalCount };
    },
    
    readyForRefund: async (testerUuid: string, pagination?: typeof DEFAULT_PAGINATION): Promise<PaginatedResult<PurchaseWithFeedback>> => {
      if (!pagination) {
        pagination = DEFAULT_PAGINATION;
      }
      
      // Get purchases that:
      // 1. Belong to this tester
      // 2. Are not refunded
      // 3. Have both feedback AND publication
      
      // First, get count for pagination
      const totalCount = await this.prisma.purchase.count({
        where: {
          testerUuid,
          refunded: false,
          feedback: { isNot: null },
          publication: { isNot: null },
        }
      });
      
      // Get the actual purchases with feedback and publication data
      const purchases = await this.prisma.purchase.findMany({
        where: {
          testerUuid,
          refunded: false,
          feedback: { isNot: null },
          publication: { isNot: null },
        },
        include: {
          feedback: true,
          publication: true,
        },
        orderBy: pagination.sort === 'order' 
          ? { orderNumber: pagination.order === 'asc' ? 'asc' : 'desc' }
          : { date: pagination.order === 'asc' ? 'asc' : 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });
      
      // Map results to PurchaseWithFeedback interface
      const results = purchases.map(p => ({
        id: p.uuid,
        testerUuid: p.testerUuid,
        date: p.date.toISOString().split('T')[0],
        order: p.orderNumber,
        description: p.description,
        amount: p.amount,
        screenshot: p.screenshot,
        screenshotSummary: p.screenshotSummary || undefined,
        refunded: p.refunded,
        feedback: p.feedback!.feedback,
        feedbackDate: p.feedback!.date.toISOString().split('T')[0],
        publicationScreenshot: p.publication!.screenshot,
        publicationDate: p.publication!.date.toISOString().split('T')[0],
      }));
      
      return { results, totalCount };
    },
    
    notRefundedAmount: async (testerUuid: string): Promise<number> => {
      const result = await this.prisma.purchase.aggregate({
        where: { testerUuid, refunded: false },
        _sum: { amount: true },
      });
      
      return result._sum.amount || 0;
    },
    
    delete: async (id: string): Promise<boolean> => {
      try {
        await this.prisma.purchase.delete({
          where: { uuid: id },
        });
        return true;
      } catch (error) {
        console.error('Error deleting purchase:', error);
        return false;
      }
    },
    
    filter: async (fn: (purchase: Purchase) => boolean): Promise<Purchase[]> => {
      const purchases = await this.getAllPurchases();
      return purchases.filter(fn);
    },

    update: async (id: string, updates: Partial<Purchase>): Promise<boolean> => {
      try {
        const data: any = {};
        
        if (updates.date !== undefined) {
          data.date = new Date(updates.date);
        }
        
        if (updates.order !== undefined) {
          data.orderNumber = updates.order;
        }
        
        if (updates.description !== undefined) {
          data.description = updates.description;
        }
        
        if (updates.amount !== undefined) {
          data.amount = updates.amount;
        }
        
        if (updates.screenshot !== undefined) {
          data.screenshot = updates.screenshot;
        }
        
        if (updates.screenshotSummary !== undefined) {
          data.screenshotSummary = updates.screenshotSummary;
        }
        
        if (updates.refunded !== undefined) {
          data.refunded = updates.refunded;
        }
        
        if (Object.keys(data).length === 0) {
          return false; // Nothing to update
        }
        
        await this.prisma.purchase.update({
          where: { uuid: id },
          data,
        });
        
        return true;
      } catch (error) {
        console.error('Error updating purchase:', error);
        return false;
      }
    },
    
    getAll: async (): Promise<Purchase[]> => {
      return this.getAllPurchases();
    },
    
    getPurchaseStatus: async (
      testerUuid: string,
      limitToNotRefunded?: boolean,
      page?: number,
      limit?: number,
      sort?: string,
      order?: string,
    ): Promise<PurchaseStatusResponse> => {
      if (!limitToNotRefunded) {
        limitToNotRefunded = false;
      }
      if (!page) {
        page = 1;
      }
      if (!limit) {
        limit = 10;
      }
      if (!sort || !['date', 'order'].includes(sort)) {
        sort = 'date';
      }
      if (!order || !['asc', 'desc'].includes(order)) {
        order = 'desc';
      }
      
      // Build the query
      const whereClause: any = { testerUuid };
      if (limitToNotRefunded) {
        whereClause.refunded = false;
      }
      
      // Get total count for pagination
      const totalCount = await this.prisma.purchase.count({
        where: whereClause,
      });
      
      // Get purchases with their associated feedback, publication, and refund status
      const purchases = await this.prisma.purchase.findMany({
        where: whereClause,
        include: {
          feedback: true,
          publication: true,
          refund: true,
        },
        orderBy: sort === 'order' 
          ? { orderNumber: order === 'asc' ? 'asc' : 'desc' }
          : { date: order === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      
      // Map to PurchaseStatus interface
      const results = purchases.map(p => ({
        purchase: p.uuid,
        testerUuid: p.testerUuid,
        date: p.date.toISOString().split('T')[0],
        order: p.orderNumber,
        description: p.description,
        amount: p.amount,
        refunded: p.refunded,
        hasFeedback: p.feedback !== null,
        hasPublication: p.publication !== null,
        hasRefund: p.refund !== null,
        publicationScreenshot: p.publication?.screenshot || null,
        purchaseScreenshot: p.screenshot,
        screenshotSummary: p.screenshotSummary || undefined,
      } as PurchaseStatus));
      
      // Add pagination info to the result
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = page;
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;
      const nextPage = hasNextPage ? currentPage + 1 : null;
      const previousPage = hasPreviousPage ? currentPage - 1 : null;
      
      const pageInfo = {
        totalCount,
        totalPages,
        currentPage,
        hasNextPage,
        hasPreviousPage,
        nextPage,
        previousPage,
      };
      
      return { results, pageInfo };
    },
  };

  /**
   * Feedback-related database operations
   */
  feedbacks: FeedbacksRepository = {
    find: async (fn: (feedback: Feedback) => boolean): Promise<Feedback | undefined> => {
      const feedbacks = await this.getAllFeedbacks();
      return feedbacks.find(fn);
    },

    filter: async (fn: (feedback: Feedback) => boolean): Promise<Feedback[]> => {
      const feedbacks = await this.getAllFeedbacks();
      return feedbacks.filter(fn);
    },

    put: async (testerId: string, newFeedback: Feedback): Promise<string> => {
      try {
        // First check if the purchase exists and belongs to this tester
        const purchase = await this.prisma.purchase.findFirst({
          where: {
            uuid: newFeedback.purchase,
            tester: {
              idMappings: {
                some: { externalId: testerId }
              }
            }
          }
        });
        
        if (!purchase) {
          throw new Error('Purchase not found or not owned by this tester');
        }
        
        // Create or update feedback
        await this.prisma.feedback.upsert({
          where: { purchaseUuid: newFeedback.purchase },
          update: {
            date: new Date(newFeedback.date),
            feedback: newFeedback.feedback,
          },
          create: {
            purchaseUuid: newFeedback.purchase,
            date: new Date(newFeedback.date),
            feedback: newFeedback.feedback,
          },
        });
        
        return newFeedback.purchase;
      } catch (error) {
        console.error('Error adding feedback:', error);
        throw error;
      }
    },

    getAll: async (): Promise<Feedback[]> => {
      return this.getAllFeedbacks();
    },
  };

  /**
   * Publication-related database operations
   */
  publications: PublicationsRepository = {
    find: async (
      fn: (publication: Publication) => boolean,
    ): Promise<Publication | undefined> => {
      const publications = await this.getAllPublications();
      return publications.find(fn);
    },

    filter: async (
      fn: (publication: Publication) => boolean,
    ): Promise<Publication[]> => {
      const publications = await this.getAllPublications();
      return publications.filter(fn);
    },

    put: async (testerId: string, newPublication: Publication): Promise<string> => {
      try {
        // First check if the purchase exists and belongs to this tester
        const purchase = await this.prisma.purchase.findFirst({
          where: {
            uuid: newPublication.purchase,
            tester: {
              idMappings: {
                some: { externalId: testerId }
              }
            }
          }
        });
        
        if (!purchase) {
          throw new Error('Purchase not found or not owned by this tester');
        }
        
        // Create or update publication
        await this.prisma.publication.upsert({
          where: { purchaseUuid: newPublication.purchase },
          update: {
            date: new Date(newPublication.date),
            screenshot: newPublication.screenshot,
          },
          create: {
            purchaseUuid: newPublication.purchase,
            date: new Date(newPublication.date),
            screenshot: newPublication.screenshot,
          },
        });
        
        return newPublication.purchase;
      } catch (error) {
        console.error('Error adding publication:', error);
        throw error;
      }
    },

    getAll: async (): Promise<Publication[]> => {
      return this.getAllPublications();
    },
  };

  /**
   * Refund-related database operations
   */
  refunds: RefundsRepository = {
    find: async (fn: (refund: Refund) => boolean): Promise<Refund | undefined> => {
      const refunds = await this.getAllRefunds();
      return refunds.find(fn);
    },

    filter: async (fn: (refund: Refund) => boolean): Promise<Refund[]> => {
      const refunds = await this.getAllRefunds();
      return refunds.filter(fn);
    },

    put: async (testerId: string, newRefund: Refund): Promise<string> => {
      try {
        // First check if the purchase exists and belongs to this tester
        const testerUuid = await this.idMappings.getTesterUuid(testerId);
        if (!testerUuid) {
          throw new Error('Tester not found');
        }
        
        const purchase = await this.prisma.purchase.findFirst({
          where: {
            uuid: newRefund.purchase,
            testerUuid
          }
        });
        
        if (!purchase) {
          throw new Error('Purchase not found or not owned by this tester');
        }
        
        // Create refund and update purchase status in a transaction
        await this.prisma.$transaction([
          // Create or update refund
          this.prisma.refund.upsert({
            where: { purchaseUuid: newRefund.purchase },
            update: {
              date: new Date(newRefund.date),
              refundDate: new Date(newRefund.refundDate),
              amount: newRefund.amount,
              transactionId: newRefund.transactionId,
            },
            create: {
              purchaseUuid: newRefund.purchase,
              date: new Date(newRefund.date),
              refundDate: new Date(newRefund.refundDate),
              amount: newRefund.amount,
              transactionId: newRefund.transactionId,
            },
          }),
          
          // Update purchase refunded status
          this.prisma.purchase.update({
            where: { uuid: newRefund.purchase },
            data: { refunded: true },
          }),
        ]);
        
        return newRefund.purchase;
      } catch (error) {
        console.error('Error adding refund:', error);
        throw error;
      }
    },

    getAll: async (): Promise<Refund[]> => {
      return this.getAllRefunds();
    },
  };

  /**
   * Reset the database
   * This is primarily for testing purposes
   */
  async reset(newData: any): Promise<void> {
    try {
      // Clear all collections
      await this.prisma.$transaction([
        this.prisma.refund.deleteMany({}),
        this.prisma.feedback.deleteMany({}),
        this.prisma.publication.deleteMany({}),
        this.prisma.purchase.deleteMany({}),
        this.prisma.idMapping.deleteMany({}),
        this.prisma.tester.deleteMany({}),
      ]);
      
      // Import new data if provided
      if (newData) {
        const { testers, purchases, feedbacks, publications, refunds } = newData;
        
        // Insert testers and ID mappings
        if (testers && testers.length) {
          for (const tester of testers) {
            await this.prisma.tester.create({
              data: {
                uuid: tester.uuid,
                name: tester.name,
              },
            });
            
            // Insert ID mappings for this tester
            if (tester.ids && tester.ids.length) {
              for (const id of tester.ids) {
                await this.prisma.idMapping.create({
                  data: {
                    externalId: id,
                    testerUuid: tester.uuid,
                  },
                });
              }
            }
          }
        }
        
        // Insert purchases
        if (purchases && purchases.length) {
          for (const purchase of purchases) {
            await this.prisma.purchase.create({
              data: {
                uuid: purchase.id,
                testerUuid: purchase.testerUuid,
                date: new Date(purchase.date),
                orderNumber: purchase.order,
                description: purchase.description,
                amount: purchase.amount,
                screenshot: purchase.screenshot,
                screenshotSummary: purchase.screenshotSummary,
                refunded: purchase.refunded,
              },
            });
          }
        }
        
        // Insert feedbacks
        if (feedbacks && feedbacks.length) {
          for (const feedback of feedbacks) {
            await this.prisma.feedback.create({
              data: {
                purchaseUuid: feedback.purchase,
                date: new Date(feedback.date),
                feedback: feedback.feedback,
              },
            });
          }
        }
        
        // Insert publications
        if (publications && publications.length) {
          for (const publication of publications) {
            await this.prisma.publication.create({
              data: {
                purchaseUuid: publication.purchase,
                date: new Date(publication.date),
                screenshot: publication.screenshot,
              },
            });
          }
        }
        
        // Insert refunds
        if (refunds && refunds.length) {
          for (const refund of refunds) {
            await this.prisma.refund.create({
              data: {
                purchaseUuid: refund.purchase,
                date: new Date(refund.date),
                refundDate: new Date(refund.refundDate),
                amount: refund.amount,
                transactionId: refund.transactionId,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  /**
   * Get raw data from the database
   * This is primarily for testing purposes
   */
  async getRawData(): Promise<any> {
    const [
      testers,
      idMappings,
      purchases,
      feedbacks,
      publications,
      refunds,
    ] = await Promise.all([
      this.prisma.tester.findMany(),
      this.prisma.idMapping.findMany(),
      this.prisma.purchase.findMany(),
      this.prisma.feedback.findMany(),
      this.prisma.publication.findMany(),
      this.prisma.refund.findMany(),
    ]);
    
    return {
      testers,
      idMappings,
      purchases,
      feedbacks,
      publications,
      refunds,
    };
  }

  /**
   * Helper method to get all testers with their IDs
   */
  private async getAllTesters(): Promise<Tester[]> {
    const testers = await this.prisma.tester.findMany({
      include: {
        idMappings: true,
      },
    });
    
    return testers.map(tester => ({
      uuid: tester.uuid,
      name: tester.name,
      ids: tester.idMappings.map(m => m.externalId),
      created_at: tester.createdAt.toISOString(),
      updated_at: tester.updatedAt.toISOString(),
    }));
  }

  /**
   * Helper method to get all purchases
   */
  private async getAllPurchases(): Promise<Purchase[]> {
    const purchases = await this.prisma.purchase.findMany();
    
    return purchases.map(p => ({
      id: p.uuid,
      testerUuid: p.testerUuid,
      date: p.date.toISOString().split('T')[0],
      order: p.orderNumber,
      description: p.description,
      amount: p.amount,
      screenshot: p.screenshot,
      screenshotSummary: p.screenshotSummary || undefined,
      refunded: p.refunded,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Helper method to get all feedbacks
   */
  private async getAllFeedbacks(): Promise<Feedback[]> {
    const feedbacks = await this.prisma.feedback.findMany();
    
    return feedbacks.map(f => ({
      purchase: f.purchaseUuid,
      date: f.date.toISOString().split('T')[0],
      feedback: f.feedback,
      created_at: f.createdAt.toISOString(),
    }));
  }

  /**
   * Helper method to get all publications
   */
  private async getAllPublications(): Promise<Publication[]> {
    const publications = await this.prisma.publication.findMany();
    
    return publications.map(p => ({
      purchase: p.purchaseUuid,
      date: p.date.toISOString().split('T')[0],
      screenshot: p.screenshot,
      create_at: p.createdAt.toISOString(),
    }));
  }

  /**
   * Helper method to get all refunds
   */
  private async getAllRefunds(): Promise<Refund[]> {
    const refunds = await this.prisma.refund.findMany();
    
    return refunds.map(r => ({
      purchase: r.purchaseUuid,
      date: r.date.toISOString().split('T')[0],
      refundDate: r.refundDate.toISOString().split('T')[0],
      amount: r.amount,
      transactionId: r.transactionId || undefined,
      created_at: r.createdAt.toISOString(),
    }));
  }

  /**
   * Create a backup of the database in JSON format
   */
  async backupToJson(): Promise<string> {
    try {
      const data = await this.getRawData();
      return JSON.stringify(data);
    } catch (error) {
      console.error('Error creating database backup:', error);
      throw error;
    }
  }

  /**
   * Restore the database from a JSON backup
   */
  async restoreFromJsonString(backup: string): Promise<{ success: boolean; message?: string }> {
    try {
      const data = JSON.parse(backup);
      await this.reset(data);
      
      return { success: true };
    } catch (error) {
      console.error('Error restoring database from backup:', error);
      return { 
        success: false, 
        message: `Error: ${(error as Error).message}` 
      };
    }
  }
}