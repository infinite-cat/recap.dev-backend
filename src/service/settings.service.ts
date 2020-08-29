import { getConnection } from 'typeorm'
import { Settings } from '../entity/pg'

export class SettingsService {
  public async getSettings(): Promise<Settings> {
    return (await getConnection().getRepository(Settings).findOne()) || new Settings()
  }

  public async getGraphqlSettings() {
    const settings = await this.getSettings()

    return {
      ...settings,
      notificationConfigurations: JSON.stringify(settings.notificationConfigurations),
    }
  }

  public async setSettings(graphqlSettings: any) {
    const settings = await this.getSettings()

    Object.assign(settings, {
      host: graphqlSettings.host,
      cleanupAfterDays: graphqlSettings.cleanupAfterDays,
      isAwsIntegrationEnabled: graphqlSettings.isAwsIntegrationEnabled,
      notificationConfigurations: graphqlSettings.notificationConfigurations && JSON.parse(graphqlSettings.notificationConfigurations),
    })

    return this.saveSettings(settings)
  }

  private async saveSettings(settings: Settings): Promise<Settings> {
    return getConnection().getRepository(Settings).save(settings)
  }
}

export const settingsService = new SettingsService()
