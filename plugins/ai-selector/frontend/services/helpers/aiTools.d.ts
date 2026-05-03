import { api } from '@eclipse-che/common';
import devfileApi from '@/services/devfileApi';
import { Workspace } from '@/services/workspace-adapter';
export declare const ADMIN_MANAGEABLE_ATTRIBUTE = "che.eclipse.org/admin-manageable";
export declare const PENDING_CLEANUP_ANNOTATION = "che.eclipse.org/pending-ai-cleanup";
export declare function stripImageTag(image: string): string;
export declare function getToolSlug(tool: api.AiToolDefinition): string;
export declare function toolCommandIds(slug: string): {
    install: string;
    symlink: string;
    run: string;
    cleanup: string;
};
export declare function getInjectedAiToolIds(workspace: Workspace, allTools: api.AiToolDefinition[]): string[];
export declare function getInjectedAiToolNames(workspace: Workspace, allTools: api.AiToolDefinition[]): string[];
export declare function addAiToolToWorkspace(workspaceOrDevWorkspace: Workspace | devfileApi.DevWorkspace, toolId: string, allTools: api.AiToolDefinition[]): devfileApi.DevWorkspace;
export declare function removeAiToolFromWorkspace(workspaceOrDevWorkspace: Workspace | devfileApi.DevWorkspace, toolId: string, allTools: api.AiToolDefinition[]): devfileApi.DevWorkspace;
export declare function sanitizeStaleAiTools(devWorkspace: devfileApi.DevWorkspace, allTools: api.AiToolDefinition[]): devfileApi.DevWorkspace | null;
export declare function updateOutdatedAiTools(devWorkspace: devfileApi.DevWorkspace, allTools: api.AiToolDefinition[]): devfileApi.DevWorkspace | null;
//# sourceMappingURL=aiTools.d.ts.map