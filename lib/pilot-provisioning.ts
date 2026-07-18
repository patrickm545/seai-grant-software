import type { PrismaClient } from '@prisma/client';
import { hashPilotPassword, normalizePilotEmail } from './pilot-auth';

export type PilotProvisioningInput = {
  organisationName: string;
  organisationSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  seaiCompanyId: string;
  websiteDomain?: string | null;
  county?: string | null;
};

export async function provisionPilotOrganisation(db: PrismaClient, input: PilotProvisioningInput) {
  const ownerEmail = normalizePilotEmail(input.ownerEmail);
  const passwordHash = await hashPilotPassword(input.ownerPassword);
  const installerId = `installer_${input.organisationSlug}`;

  return db.$transaction(async (tx) => {
    const existingOrganisation = await tx.organisation.findUnique({
      where: { slug: input.organisationSlug }
    });
    if (existingOrganisation && existingOrganisation.type !== 'INSTALLER') {
      throw new Error('The organisation slug is already used by a non-installer organisation.');
    }

    const organisation = await tx.organisation.upsert({
      where: { slug: input.organisationSlug },
      update: {
        name: input.organisationName,
        type: 'INSTALLER',
        status: 'ACTIVE',
        verified: true
      },
      create: {
        name: input.organisationName,
        slug: input.organisationSlug,
        type: 'INSTALLER',
        status: 'ACTIVE',
        verified: true
      }
    });

    const existingUser = await tx.user.findUnique({
      where: { email: ownerEmail },
      include: { memberships: true }
    });
    if (existingUser?.memberships.some((membership) => membership.organisationId !== organisation.id)) {
      throw new Error('The owner email already belongs to another organisation.');
    }

    const user = await tx.user.upsert({
      where: { email: ownerEmail },
      update: {
        displayName: input.ownerName,
        passwordHash,
        status: 'ACTIVE'
      },
      create: {
        email: ownerEmail,
        displayName: input.ownerName,
        passwordHash,
        status: 'ACTIVE'
      }
    });

    await tx.organisationMembership.upsert({
      where: { userId: user.id },
      update: {
        organisationId: organisation.id,
        status: 'ACTIVE',
        isOwner: true,
        role: 'ORGANISATION_OWNER'
      },
      create: {
        organisationId: organisation.id,
        userId: user.id,
        status: 'ACTIVE',
        isOwner: true,
        role: 'ORGANISATION_OWNER'
      }
    });

    const installer = await tx.installer.upsert({
      where: { id: installerId },
      update: {
        organisationId: organisation.id,
        name: input.organisationName,
        slug: input.organisationSlug,
        seaiCompanyId: input.seaiCompanyId,
        websiteDomain: input.websiteDomain || null,
        county: input.county || null
      },
      create: {
        id: installerId,
        organisationId: organisation.id,
        name: input.organisationName,
        slug: input.organisationSlug,
        seaiCompanyId: input.seaiCompanyId,
        websiteDomain: input.websiteDomain || null,
        county: input.county || null
      }
    });

    return { organisation, user, installer };
  });
}
