import { StoredTrace, Settings } from '../../../entity/pg'

export abstract class TraceEnricher {
  readonly unitType: string

  protected isEnabled: boolean = true

  public supports(trace: StoredTrace): boolean {
    return this.isEnabled && this.unitType === trace.unit.type
  }

  public abstract onSettingsUpdated(newSettings: Settings): void

  public abstract enrich(traces: StoredTrace[]): Promise<StoredTrace[]>
}
