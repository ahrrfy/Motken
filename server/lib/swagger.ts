import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "سِرَاجُ الْقُرْآنِ API",
      version: "1.0.0",
      description: "API نظام حفظ وتعليم القرآن الكريم",
      contact: {
        name: "فريق سِرَاجُ الْقُرْآنِ",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        session: {
          type: "apiKey",
          in: "cookie",
          name: "mutqin.sid",
          description: "Session cookie (set after login)",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: { type: "string", description: "رسالة الخطأ بالعربية" },
            field: { type: "string", description: "اسم الحقل (إن وُجد)" },
            source: { type: "string", enum: ["validation", "database", "permission", "server"] },
            details: { type: "array", items: { type: "string" } },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            name: { type: "string" },
            role: { type: "string", enum: ["admin", "teacher", "student", "supervisor", "parent"] },
            mosqueId: { type: "string", nullable: true },
            phone: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Mosque: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            province: { type: "string" },
            city: { type: "string" },
            area: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "المصادقة وتسجيل الدخول" },
      { name: "Users", description: "إدارة المستخدمين" },
      { name: "Mosques", description: "إدارة المساجد" },
      { name: "Assignments", description: "الواجبات والتسميع" },
      { name: "Attendance", description: "الحضور والغياب" },
      { name: "Courses", description: "الدورات والشهادات" },
      { name: "Messages", description: "الرسائل والإشعارات" },
      { name: "Points", description: "النقاط والمكافآت" },
      { name: "Reports", description: "التقارير والتحليلات" },
      { name: "System", description: "إعدادات النظام" },
    ],
  },
  apis: ["./server/routes/*.ts"],
};

export function setupSwagger(app: Express) {
  const spec = swaggerJsdoc(options);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-bottom: 20px }
    `,
    customSiteTitle: "سِرَاجُ الْقُرْآنِ API Documentation",
  }));

  // Raw spec endpoint
  app.get("/api-docs.json", (_req, res) => {
    res.json(spec);
  });
}
