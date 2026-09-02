import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpAuthService } from './mcp-auth.service';
import { FiscalTools } from './tools/fiscal.tools';
import { FinanceTools } from './tools/finance.tools';
import {
  CreateTransactionSchema,
  GetBudgetAuditSchema,
  GetFiscalSummarySchema,
  GetMonthlyTaxChecklistSchema,
  GetNetWorthAndLiquiditySchema,
  RecordDebtPaymentSchema,
  SimulateTaxScenarioSchema,
} from './schemas/tool-inputs.schema';

@Injectable()
export class McpServerService implements OnModuleInit {
  private readonly logger = new Logger(McpServerService.name);
  private mcpServer: McpServer;

  constructor(
    private readonly authService: McpAuthService,
    private readonly fiscalTools: FiscalTools,
    private readonly financeTools: FinanceTools,
  ) {
    this.mcpServer = new McpServer({
      name: 'guilliman-tique-mcp',
      version: '1.0.0',
    });
  }

  onModuleInit() {
    this.registerTools();
  }

  /**
   * Registers all financial and fiscal tools into the McpServer instance.
   * Every tool execution enforces ADMIN role authentication.
   */
  private registerTools() {
    // 1. Fiscal Summary Tool
    this.mcpServer.tool(
      'tique_get_fiscal_summary',
      'Obtiene la liquidación y proyección tributaria consolidada de Rentas de Trabajo (4ta y 5ta categoría SUNAT Perú) para un año fiscal.',
      GetFiscalSummarySchema,
      async (args) => {
        const admin = await this.authService.getAdminUserContext();
        return this.fiscalTools.getFiscalSummary(admin, args);
      },
    );

    // 2. Monthly Tax Checklist Tool
    this.mcpServer.tool(
      'tique_get_monthly_tax_checklist',
      'Consulta el estado de obligaciones fiscales del mes (emisión RHE Datincorp, pago a cuenta 8%, saldo a favor y vencimiento según RUC dígito 3).',
      GetMonthlyTaxChecklistSchema,
      async (args) => {
        const admin = await this.authService.getAdminUserContext();
        return this.fiscalTools.getMonthlyTaxChecklist(admin, args);
      },
    );

    // 3. Simulate Tax Scenario Tool
    this.mcpServer.tool(
      'tique_simulate_tax_scenario',
      'Simula el impacto fiscal anual en la escala progresiva acumulativa ante variaciones de ingresos brutos en 4ta categoría o deducciones de 3 UIT.',
      SimulateTaxScenarioSchema,
      async (args) => {
        const admin = await this.authService.getAdminUserContext();
        return this.fiscalTools.simulateTaxScenario(admin, args);
      },
    );

    // 4. Net Worth and Liquidity Tool
    this.mcpServer.tool(
      'tique_get_net_worth_and_liquidity',
      'Reporte consolidado de patrimonio neto, activos, pasivos y liquidez operativa desglosado por cuentas y monedas (USD, PEN, VES).',
      GetNetWorthAndLiquiditySchema,
      async (args) => {
        const admin = await this.authService.getAdminUserContext();
        return this.financeTools.getNetWorthAndLiquidity(admin, args);
      },
    );

    // 5. Budget Audit Tool (50/30/20 & Ant Expenses)
    this.mcpServer.tool(
      'tique_get_budget_audit',
      'Audita egresos mensuales bajo la regla presupuestaria 50/30/20 y detecta gastos hormiga no esenciales.',
      GetBudgetAuditSchema,
      async (args) => {
        const admin = await this.authService.getAdminUserContext();
        return this.financeTools.getBudgetAudit(admin, args);
      },
    );

    // 6. Create Transaction Tool
    this.mcpServer.tool(
      'tique_create_transaction',
      'Registra un nuevo movimiento financiero categorizado con trazabilidad y flags de deducción 3 UIT.',
      CreateTransactionSchema,
      async (args) => {
        const admin = await this.authService.getAdminUserContext();
        return this.financeTools.createTransaction(admin, args);
      },
    );

    // 7. Record Debt Payment Tool
    this.mcpServer.tool(
      'tique_record_debt_payment',
      'Registra un abono a un préstamo o tarjeta de crédito garantizando consistencia transaccional y descuento de fondos.',
      RecordDebtPaymentSchema,
      async (args) => {
        const admin = await this.authService.getAdminUserContext();
        return this.financeTools.recordDebtPayment(admin, args);
      },
    );

    this.logger.log('MCP: 7 tools registered successfully with ADMIN guard.');
  }

  /**
   * Starts the MCP server using Stdio transport for local AI hosts like Gemini Spark.
   */
  async startStdioServer(): Promise<void> {
    // Validate Admin user exists before connecting transport
    const admin = await this.authService.getAdminUserContext();
    this.logger.log(
      `Starting Stdio MCP Transport for Admin user: ${admin.email} (${admin.id})`,
    );

    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    this.logger.log('Guilliman Tique MCP Server connected to stdio transport.');
  }

  /**
   * Returns the underlying McpServer instance for testing or alternative transports (SSE).
   */
  getServerInstance(): McpServer {
    return this.mcpServer;
  }
}
