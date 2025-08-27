import { supabase } from '@/lib/supabase'

export type NotificationData = {
  workspaceId: string
  actorUserId: string
  actionType: 'create' | 'update' | 'delete'
  entityType: 'project' | 'contact' | 'meeting' | 'submission'
  entityId: string
  entityTitle: string
  customTitle?: string
  customMessage?: string
}

export async function createNotification(data: NotificationData) {
  try {
    const {
      workspaceId,
      actorUserId,
      actionType,
      entityType,
      entityId,
      entityTitle,
      customTitle,
      customMessage
    } = data

    // Generate default title and message if not provided
    const title = customTitle || generateDefaultTitle(actionType, entityType, entityTitle)
    const message = customMessage || generateDefaultMessage(actionType, entityType, entityTitle)

    // Call the database function to create notifications for all workspace members
    const { error } = await supabase
      .rpc('create_workspace_notification', {
        p_workspace_id: workspaceId,
        p_actor_user_id: actorUserId,
        p_action_type: actionType,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_entity_title: entityTitle,
        p_title: title,
        p_message: message
      })

    if (error) {
      console.error('Error creating notification:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error creating notification:', error)
    return { success: false, error }
  }
}

function generateDefaultTitle(actionType: string, entityType: string, entityTitle: string): string {
  const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  
  switch (actionType) {
    case 'create':
      return `New ${entityName} Created`
    case 'update':
      return `${entityName} Updated`
    case 'delete':
      return `${entityName} Deleted`
    default:
      return `${entityName} ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`
  }
}

function generateDefaultMessage(actionType: string, entityType: string, entityTitle: string): string {
  const article = ['a', 'e', 'i', 'o', 'u'].includes(entityType[0].toLowerCase()) ? 'an' : 'a'
  
  switch (actionType) {
    case 'create':
      return `A new ${entityType} "${entityTitle}" was created`
    case 'update':
      return `The ${entityType} "${entityTitle}" was updated`
    case 'delete':
      return `The ${entityType} "${entityTitle}" was deleted`
    default:
      return `${article} ${entityType} "${entityTitle}" was ${actionType}d`
  }
}

// Utility functions for common notification patterns
export async function notifyProjectCreated(workspaceId: string, actorUserId: string, projectId: string, projectTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'create',
    entityType: 'project',
    entityId: projectId,
    entityTitle: projectTitle
  })
}

export async function notifyProjectUpdated(workspaceId: string, actorUserId: string, projectId: string, projectTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'update',
    entityType: 'project',
    entityId: projectId,
    entityTitle: projectTitle
  })
}

export async function notifyProjectDeleted(workspaceId: string, actorUserId: string, projectId: string, projectTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'delete',
    entityType: 'project',
    entityId: projectId,
    entityTitle: projectTitle
  })
}

export async function notifyContactCreated(workspaceId: string, actorUserId: string, contactId: string, contactName: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'create',
    entityType: 'contact',
    entityId: contactId,
    entityTitle: contactName
  })
}

export async function notifyContactUpdated(workspaceId: string, actorUserId: string, contactId: string, contactName: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'update',
    entityType: 'contact',
    entityId: contactId,
    entityTitle: contactName
  })
}

export async function notifyContactDeleted(workspaceId: string, actorUserId: string, contactId: string, contactName: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'delete',
    entityType: 'contact',
    entityId: contactId,
    entityTitle: contactName
  })
}

export async function notifyMeetingCreated(workspaceId: string, actorUserId: string, meetingId: string, meetingTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'create',
    entityType: 'meeting',
    entityId: meetingId,
    entityTitle: meetingTitle
  })
}

export async function notifyMeetingUpdated(workspaceId: string, actorUserId: string, meetingId: string, meetingTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'update',
    entityType: 'meeting',
    entityId: meetingId,
    entityTitle: meetingTitle
  })
}

export async function notifyMeetingDeleted(workspaceId: string, actorUserId: string, meetingId: string, meetingTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'delete',
    entityType: 'meeting',
    entityId: meetingId,
    entityTitle: meetingTitle
  })
}

export async function notifySubmissionCreated(workspaceId: string, actorUserId: string, submissionId: string, submissionTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'create',
    entityType: 'submission',
    entityId: submissionId,
    entityTitle: submissionTitle
  })
}

export async function notifySubmissionUpdated(workspaceId: string, actorUserId: string, submissionId: string, submissionTitle: string) {
  return createNotification({
    workspaceId,
    actorUserId,
    actionType: 'update',
    entityType: 'submission',
    entityId: submissionId,
    entityTitle: submissionTitle
  })
}