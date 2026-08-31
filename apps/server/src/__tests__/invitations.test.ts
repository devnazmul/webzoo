import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { generateAccessToken } from '../utils/token';

describe('Invitations API', () => {
  let ownerToken: string;
  let workspaceId: string;
  let ownerId: string;
  let inviteToken: string;
  const uniqueId = Date.now().toString();

  beforeAll(async () => {
    // Create an owner
    const passwordHash = await hashPassword('password123');
    const owner = await prisma.user.create({
      data: { email: `owner-${uniqueId}@example.com`, name: 'Owner', passwordHash },
    });
    ownerId = owner.id;
    ownerToken = generateAccessToken({ userId: owner.id, email: owner.email });

    // Create a workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: `Test Workspace ${uniqueId}`,
        members: {
          create: { userId: owner.id, role: 'OWNER' },
        },
      },
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    // Cleanup only test data if needed, or leave it since it's dev db
  });

  it('should create an invitation for a new email', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: `newuser-${uniqueId}@example.com` });

    expect(res.status).toBe(201);
    expect(res.body.data.message).toBe('Invitation sent successfully');

    // Verify it was created in DB
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { email: `newuser-${uniqueId}@example.com` },
    });
    expect(invitation).toBeTruthy();
    expect(invitation!.status).toBe('PENDING');
    inviteToken = invitation!.token;
  });

  it('should fetch invitation details using the token', async () => {
    const res = await request(app).get(`/api/invitations/${inviteToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(`newuser-${uniqueId}@example.com`);
    expect(res.body.data.workspaceName).toBe(`Test Workspace ${uniqueId}`);
  });

  it('should accept the invitation for a newly registered user', async () => {
    // Register the invited user
    const passwordHash = await hashPassword('password123');
    const newUser = await prisma.user.create({
      data: { email: `newuser-${uniqueId}@example.com`, name: 'New User', passwordHash },
    });
    const newToken = generateAccessToken({ userId: newUser.id, email: newUser.email });

    // Accept invitation
    const res = await request(app)
      .post(`/api/invitations/${inviteToken}/accept`)
      .set('Authorization', `Bearer ${newToken}`);

    expect(res.status).toBe(200);

    // Verify membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: newUser.id, workspaceId } },
    });
    expect(membership).toBeTruthy();

    // Verify invitation status
    const inv = await prisma.workspaceInvitation.findUnique({ where: { token: inviteToken } });
    expect(inv!.status).toBe('ACCEPTED');
  });

  it('should create an in-app notification when inviting an existing user', async () => {
    // Create an existing user not in the workspace
    const passwordHash = await hashPassword('password123');
    const existingUser = await prisma.user.create({
      data: { email: 'existing@example.com', name: 'Existing User', passwordHash },
    });

    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'existing@example.com' });

    expect(res.status).toBe(201);

    const notification = await prisma.notification.findFirst({
      where: { userId: existingUser.id, type: 'WORKSPACE_INVITE' },
    });
    expect(notification).toBeTruthy();
    expect(notification!.workspaceId).toBe(workspaceId);
  });
});
