import { Injectable, BadRequestException } from '@nestjs/common';
import type { ChannelAdapter } from './channel-adapter.interface';
import { MockChannelAdapter } from './adapters/mock.adapter';

/**
 * Factory that maps adapterType strings to ChannelAdapter instances.
 * Adding a real adapter (SiteMinder, DerbySoft) = register here.
 */
@Injectable()
export class ChannelAdapterFactory {
  private adapters: Map<string, ChannelAdapter> = new Map();

  constructor(private readonly mockAdapter: MockChannelAdapter) {
    this.adapters.set('mock', this.mockAdapter);
    // Future: this.adapters.set('siteminder', this.siteminderAdapter);
    // Future: this.adapters.set('derbysoft', this.derbysoftAdapter);
  }

  getAdapter(adapterType: string): ChannelAdapter {
    const adapter = this.adapters.get(adapterType);
    if (!adapter) {
      throw new BadRequestException(
        `Unknown channel adapter type: '${adapterType}'. Available: ${[...this.adapters.keys()].join(', ')}`,
      );
    }
    return adapter;
  }

  getAvailableAdapterTypes(): string[] {
    return [...this.adapters.keys()];
  }
}
