export type TemporaryCredentialDelivery = {
  recipientEmail: string;
  recipientName: string;
  organisationName: string;
  loginUrl: string;
  temporaryCredential: string;
  expiresAt: Date;
  operationId: string;
};

export type CredentialDeliveryReceipt = {
  providerDeliveryId: string;
  status: 'ACCEPTED' | 'DELIVERED';
};

export interface CredentialDeliveryAdapter {
  readonly name: string;
  deliverTemporaryCredential(
    delivery: TemporaryCredentialDelivery
  ): Promise<CredentialDeliveryReceipt>;
}

/**
 * Test-only adapter. It deliberately retains neither the request nor the
 * temporary credential and returns only a synthetic, non-secret receipt.
 */
export class FakeCredentialDeliveryAdapter implements CredentialDeliveryAdapter {
  readonly name = 'fake';
  private deliveryCount = 0;

  async deliverTemporaryCredential(
    delivery: TemporaryCredentialDelivery
  ): Promise<CredentialDeliveryReceipt> {
    if (!delivery.temporaryCredential) throw new Error('Credential delivery failed safely.');
    this.deliveryCount += 1;
    return {
      providerDeliveryId: `fake-delivery-${this.deliveryCount}`,
      status: 'DELIVERED'
    };
  }

  get safeDeliveryCount() {
    return this.deliveryCount;
  }
}

export class FailingCredentialDeliveryAdapter implements CredentialDeliveryAdapter {
  readonly name = 'failing-test-adapter';

  async deliverTemporaryCredential(): Promise<never> {
    throw new Error('Credential delivery failed safely.');
  }
}
