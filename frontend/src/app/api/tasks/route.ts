import { NextResponse } from 'next/server';
import { writeConfig } from '@/lib/arkiv/server';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    system: 'ArkivTrace',
    config: writeConfig(),
  });
}
