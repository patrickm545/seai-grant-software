import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type PortalDocumentDownloadContext = {
  params: Promise<{
    token: string;
    documentId: string;
  }>;
};

function contentDisposition(filename: string) {
  const safeFilename = filename.replace(/["\\\r\n]/g, '').slice(0, 140) || 'document';
  return `attachment; filename="${safeFilename}"`;
}

function isRedirectableStorageUrl(value: string | null | undefined) {
  return Boolean(value && (/^https?:\/\//i.test(value) || value.startsWith('/')));
}

export async function GET(request: NextRequest, { params }: PortalDocumentDownloadContext) {
  const { token, documentId } = await params;
  const document = await prisma.leadDocument.findFirst({
    where: {
      id: documentId,
      lead: {
        portalToken: token
      }
    },
    select: {
      fileName: true,
      originalFilename: true,
      mimeType: true,
      storageUrl: true,
      contentBytes: true
    }
  });

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (document.contentBytes) {
    return new Response(Buffer.from(document.contentBytes), {
      headers: {
        'Content-Type': document.mimeType || 'application/octet-stream',
        'Content-Disposition': contentDisposition(document.originalFilename || document.fileName),
        'Cache-Control': 'private, no-store'
      }
    });
  }

  if (isRedirectableStorageUrl(document.storageUrl)) {
    return NextResponse.redirect(new URL(document.storageUrl!, request.url));
  }

  return NextResponse.json({ error: 'Stored file is not available for download' }, { status: 404 });
}
