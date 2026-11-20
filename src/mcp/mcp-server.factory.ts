import { Injectable, Logger } from '@nestjs/common';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { McpActor } from './mcp-actor';
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

/**
 * The tool sets an MCP server can expose. `read-only` is the HTTP surface
 * (S6); `stdio` keeps the local CLI's full set, writes included (S7).
 */
export type McpToolset = 'read-only' | 'stdio';

/** The five read tools `tools/list` shows over HTTP (S6). */
export const MCP_READ_ONLY_TOOL_NAMES = [
  'tique_get_fiscal_summary',
  'tique_get_monthly_tax_checklist',
  'tique_simulate_tax_scenario',
  'tique_get_net_worth_and_liquidity',
  'tique_get_budget_audit',
] as const;

/** The two write tools, stdio only (S6, S7). */
export const MCP_WRITE_TOOL_NAMES = [
  'tique_create_transaction',
  'tique_record_debt_payment',
] as const;

/** Every tool the local stdio server registers (S7). */
export const MCP_ALL_TOOL_NAMES: readonly string[] = [
  ...MCP_READ_ONLY_TOOL_NAMES,
  ...MCP_WRITE_TOOL_NAMES,
];

/**
 * Builds a fresh, unconnected `McpServer` whose tools are bound to one acting
 * user (S5). The HTTP route calls it once per request, so no two callers ever
 * share a server, a transport, or an identity; stdio calls it once per process.
 */
@Injectable()
export class McpServerFactory {
  private readonly logger = new Logger(McpServerFactory.name);

  constructor(
    private readonly fiscalTools: FiscalTools,
    private readonly financeTools: FinanceTools,
  ) {}

  /**
   * @param actor the user every tool of this server runs as
   * @param toolset `read-only` for the HTTP route, `stdio` for the CLI
   */
  createServer(actor: McpActor, toolset: McpToolset): McpServer {
    const server = new McpServer({
      name: 'guilliman-tique-mcp',
      version: '1.0.0',
    });

    server.tool(
      'tique_get_fiscal_summary',
      'Obtiene la liquidación y proyección tributaria consolidada de Rentas de Trabajo (4ta y 5ta categoría SUNAT Perú) para un año fiscal.',
      GetFiscalSummarySchema,
      async (args) => this.fiscalTools.getFiscalSummary(actor, args),
    );

    server.tool(
      'tique_get_monthly_tax_checklist',
      'Consulta el estado de obligaciones fiscales del mes (emisión RHE Datincorp, pago a cuenta 8%, saldo a favor y vencimiento según RUC dígito 3).',
      GetMonthlyTaxChecklistSchema,
      async (args) => this.fiscalTools.getMonthlyTaxChecklist(actor, args),
    );

    server.tool(
      'tique_simulate_tax_scenario',
      'Simula el impacto fiscal anual en la escala progresiva acumulativa ante variaciones de ingresos brutos en 4ta categoría o deducciones de 3 UIT.',
      SimulateTaxScenarioSchema,
      async (args) => this.fiscalTools.simulateTaxScenario(actor, args),
    );

    server.tool(
      'tique_get_net_worth_and_liquidity',
      'Reporte consolidado de patrimonio neto, activos, pasivos y liquidez operativa desglosado por cuentas y monedas (USD, PEN, VES).',
      GetNetWorthAndLiquiditySchema,
      async (args) => this.financeTools.getNetWorthAndLiquidity(actor, args),
    );

    server.tool(
      'tique_get_budget_audit',
      'Audita egresos mensuales bajo la regla presupuestaria 50/30/20 y detecta gastos hormiga no esenciales.',
      GetBudgetAuditSchema,
      async (args) => this.financeTools.getBudgetAudit(actor, args),
    );

    if (toolset === 'stdio') {
      server.tool(
        'tique_create_transaction',
        'Registra un nuevo movimiento financiero categorizado con trazabilidad y flags de deducción 3 UIT.',
        CreateTransactionSchema,
        async (args) => this.financeTools.createTransaction(actor, args),
      );

      server.tool(
        'tique_record_debt_payment',
        'Registra un abono a un préstamo o tarjeta de crédito garantizando consistencia transaccional y descuento de fondos.',
        RecordDebtPaymentSchema,
        async (args) => this.financeTools.recordDebtPayment(actor, args),
      );
    }

    this.logger.log(
      `MCP: ${toolset === 'stdio' ? MCP_ALL_TOOL_NAMES.length : MCP_READ_ONLY_TOOL_NAMES.length} tools registered for ${actor.id}.`,
    );

    return server;
  }
}
