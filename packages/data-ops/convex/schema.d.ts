declare const _default: import("convex/server").SchemaDefinition<{
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        avatarUrl?: string | undefined;
        email?: string | undefined;
        name?: string | undefined;
        createdAt?: number | undefined;
        updatedAt?: number | undefined;
        image?: string | undefined;
        emailVerificationTime?: number | undefined;
        phone?: string | undefined;
        phoneVerificationTime?: number | undefined;
        isAnonymous?: boolean | undefined;
        defaultPortalLogoUrl?: string | undefined;
        defaultPortalAccentColor?: string | undefined;
        role?: "freelancer" | "studio" | "in-house" | "agency" | undefined;
        plan?: "free" | "pro" | undefined;
        workCategory?: "branding" | "web-design" | "product-design" | "app-design" | "web-app" | "packaging" | "motion-design" | "illustration" | "other" | undefined;
        onboardingCompletedAt?: number | undefined;
        onboardingProjectCreatedAt?: number | undefined;
        onboardingPaywallSeenAt?: number | undefined;
        firstPaymentEmailSentAt?: number | undefined;
    }, {
        name: import("convex/values").VString<string | undefined, "optional">;
        image: import("convex/values").VString<string | undefined, "optional">;
        email: import("convex/values").VString<string | undefined, "optional">;
        emailVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        phoneVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        isAnonymous: import("convex/values").VBoolean<boolean | undefined, "optional">;
        avatarUrl: import("convex/values").VString<string | undefined, "optional">;
        defaultPortalLogoUrl: import("convex/values").VString<string | undefined, "optional">;
        defaultPortalAccentColor: import("convex/values").VString<string | undefined, "optional">;
        role: import("convex/values").VUnion<"freelancer" | "studio" | "in-house" | "agency" | undefined, [import("convex/values").VLiteral<"freelancer", "required">, import("convex/values").VLiteral<"studio", "required">, import("convex/values").VLiteral<"in-house", "required">, import("convex/values").VLiteral<"agency", "required">], "optional", never>;
        plan: import("convex/values").VUnion<"free" | "pro" | undefined, [import("convex/values").VLiteral<"free", "required">, import("convex/values").VLiteral<"pro", "required">], "optional", never>;
        workCategory: import("convex/values").VUnion<"branding" | "web-design" | "product-design" | "app-design" | "web-app" | "packaging" | "motion-design" | "illustration" | "other" | undefined, [import("convex/values").VLiteral<"branding", "required">, import("convex/values").VLiteral<"web-design", "required">, import("convex/values").VLiteral<"product-design", "required">, import("convex/values").VLiteral<"app-design", "required">, import("convex/values").VLiteral<"web-app", "required">, import("convex/values").VLiteral<"packaging", "required">, import("convex/values").VLiteral<"motion-design", "required">, import("convex/values").VLiteral<"illustration", "required">, import("convex/values").VLiteral<"other", "required">], "optional", never>;
        onboardingCompletedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        onboardingProjectCreatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        onboardingPaywallSeenAt: import("convex/values").VFloat64<number | undefined, "optional">;
        firstPaymentEmailSentAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number | undefined, "optional">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "avatarUrl" | "email" | "name" | "createdAt" | "updatedAt" | "image" | "emailVerificationTime" | "phone" | "phoneVerificationTime" | "isAnonymous" | "defaultPortalLogoUrl" | "defaultPortalAccentColor" | "role" | "plan" | "workCategory" | "onboardingCompletedAt" | "onboardingProjectCreatedAt" | "onboardingPaywallSeenAt" | "firstPaymentEmailSentAt">, {
        email: ["email", "_creationTime"];
        phone: ["phone", "_creationTime"];
    }, {}, {}>;
    clients: import("convex/server").TableDefinition<import("convex/values").VObject<{
        avatarUrl?: string | undefined;
        email?: string | undefined;
        name: string;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        name: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string | undefined, "optional">;
        avatarUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "avatarUrl" | "email" | "name" | "createdAt" | "updatedAt" | "userId">, {
        by_user: ["userId", "_creationTime"];
        by_user_name: ["userId", "name", "_creationTime"];
    }, {}, {}>;
    projects: import("convex/server").TableDefinition<import("convex/values").VObject<{
        projectImageUrl?: string | undefined;
        clientEmail?: string | undefined;
        clientAvatarUrl?: string | undefined;
        startMarkerImageUrl?: string | undefined;
        endMarkerImageUrl?: string | undefined;
        type: "branding" | "web-design" | "product-design" | "app-design" | "web-app" | "packaging" | "motion-design" | "illustration" | "other";
        name: string;
        status: "completed" | "active" | "paused";
        progress: number;
        createdAt: number;
        updatedAt: number;
        clientName: string;
        startDate: number;
        endDate: number;
        userId: import("convex/values").GenericId<"users">;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        name: import("convex/values").VString<string, "required">;
        clientName: import("convex/values").VString<string, "required">;
        clientEmail: import("convex/values").VString<string | undefined, "optional">;
        clientAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        startMarkerImageUrl: import("convex/values").VString<string | undefined, "optional">;
        endMarkerImageUrl: import("convex/values").VString<string | undefined, "optional">;
        projectImageUrl: import("convex/values").VString<string | undefined, "optional">;
        type: import("convex/values").VUnion<"branding" | "web-design" | "product-design" | "app-design" | "web-app" | "packaging" | "motion-design" | "illustration" | "other", [import("convex/values").VLiteral<"branding", "required">, import("convex/values").VLiteral<"web-design", "required">, import("convex/values").VLiteral<"product-design", "required">, import("convex/values").VLiteral<"app-design", "required">, import("convex/values").VLiteral<"web-app", "required">, import("convex/values").VLiteral<"packaging", "required">, import("convex/values").VLiteral<"motion-design", "required">, import("convex/values").VLiteral<"illustration", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        status: import("convex/values").VUnion<"completed" | "active" | "paused", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"paused", "required">, import("convex/values").VLiteral<"completed", "required">], "required", never>;
        startDate: import("convex/values").VFloat64<number, "required">;
        endDate: import("convex/values").VFloat64<number, "required">;
        progress: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "type" | "name" | "status" | "progress" | "createdAt" | "updatedAt" | "clientName" | "projectImageUrl" | "startDate" | "endDate" | "clientEmail" | "clientAvatarUrl" | "userId" | "startMarkerImageUrl" | "endMarkerImageUrl">, {
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
    }, {}, {}>;
    phases: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name: string;
        status: "completed" | "active" | "upcoming";
        projectId: import("convex/values").GenericId<"projects">;
        order: number;
        progress: number;
        createdAt: number;
        updatedAt: number;
    }, {
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        name: import("convex/values").VString<string, "required">;
        order: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VUnion<"completed" | "active" | "upcoming", [import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"upcoming", "required">], "required", never>;
        progress: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "status" | "projectId" | "order" | "progress" | "createdAt" | "updatedAt">, {
        by_project: ["projectId", "_creationTime"];
        by_project_order: ["projectId", "order", "_creationTime"];
    }, {}, {}>;
    tasks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        dueDate?: number | undefined;
        assigneeIds?: string[] | undefined;
        summary?: string | undefined;
        priority?: "low" | "medium" | "high" | undefined;
        boardStatus?: "backlog" | "todo" | "in-progress" | "done" | undefined;
        content?: string | undefined;
        order: number;
        createdAt: number;
        updatedAt: number;
        phaseId: import("convex/values").GenericId<"phases">;
        title: string;
        isCompleted: boolean;
    }, {
        phaseId: import("convex/values").VId<import("convex/values").GenericId<"phases">, "required">;
        title: import("convex/values").VString<string, "required">;
        isCompleted: import("convex/values").VBoolean<boolean, "required">;
        summary: import("convex/values").VString<string | undefined, "optional">;
        content: import("convex/values").VString<string | undefined, "optional">;
        dueDate: import("convex/values").VFloat64<number | undefined, "optional">;
        assigneeIds: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        priority: import("convex/values").VUnion<"low" | "medium" | "high" | undefined, [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">], "optional", never>;
        boardStatus: import("convex/values").VUnion<"backlog" | "todo" | "in-progress" | "done" | undefined, [import("convex/values").VLiteral<"backlog", "required">, import("convex/values").VLiteral<"todo", "required">, import("convex/values").VLiteral<"in-progress", "required">, import("convex/values").VLiteral<"done", "required">], "optional", never>;
        order: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "order" | "createdAt" | "updatedAt" | "phaseId" | "title" | "isCompleted" | "dueDate" | "assigneeIds" | "summary" | "priority" | "boardStatus" | "content">, {
        by_phase: ["phaseId", "_creationTime"];
        by_phase_order: ["phaseId", "order", "_creationTime"];
    }, {}, {}>;
    attachments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        storageId?: import("convex/values").GenericId<"_storage"> | undefined;
        r2ObjectKey?: string | undefined;
        type: "other" | "image" | "document" | "pdf";
        createdAt: number;
        url: string;
        taskId: import("convex/values").GenericId<"tasks">;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        storageId: import("convex/values").VId<import("convex/values").GenericId<"_storage"> | undefined, "optional">;
        r2ObjectKey: import("convex/values").VString<string | undefined, "optional">;
        type: import("convex/values").VUnion<"other" | "image" | "document" | "pdf", [import("convex/values").VLiteral<"image", "required">, import("convex/values").VLiteral<"pdf", "required">, import("convex/values").VLiteral<"document", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        url: import("convex/values").VString<string, "required">;
        fileName: import("convex/values").VString<string, "required">;
        fileSize: import("convex/values").VFloat64<number, "required">;
        mimeType: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "type" | "createdAt" | "url" | "taskId" | "storageId" | "r2ObjectKey" | "fileName" | "fileSize" | "mimeType">, {
        by_task: ["taskId", "_creationTime"];
    }, {}, {}>;
    projectDesignConnections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string | undefined;
        externalProjectId?: string | undefined;
        lastSyncedAt?: number | undefined;
        status: "error" | "active" | "archived";
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        updatedAt: number;
        provider: "stitch";
        externalProjectUrl: string;
    }, {
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        provider: import("convex/values").VLiteral<"stitch", "required">;
        externalProjectId: import("convex/values").VString<string | undefined, "optional">;
        externalProjectUrl: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"error" | "active" | "archived", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"error", "required">, import("convex/values").VLiteral<"archived", "required">], "required", never>;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "projectId" | "createdAt" | "updatedAt" | "title" | "provider" | "externalProjectId" | "externalProjectUrl" | "lastSyncedAt">, {
        by_project: ["projectId", "_creationTime"];
        by_project_provider: ["projectId", "provider", "_creationTime"];
    }, {}, {}>;
    projectGeneratedDesigns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        phaseId?: import("convex/values").GenericId<"phases"> | undefined;
        title?: string | undefined;
        lastSyncedAt?: number | undefined;
        prompt?: string | undefined;
        deviceType?: "DEVICE_TYPE_UNSPECIFIED" | "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC" | undefined;
        modelId?: "MODEL_ID_UNSPECIFIED" | "GEMINI_3_PRO" | "GEMINI_3_FLASH" | undefined;
        stitchProjectId?: string | undefined;
        stitchScreenId?: string | undefined;
        stitchScreenUrl?: string | undefined;
        sortOrder?: number | undefined;
        errorMessage?: string | undefined;
        status: "error" | "ready";
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        r2ObjectKey: string;
        provider: "stitch";
        source: "stage_proxy" | "user_sync";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        phaseId: import("convex/values").VId<import("convex/values").GenericId<"phases"> | undefined, "optional">;
        provider: import("convex/values").VLiteral<"stitch", "required">;
        source: import("convex/values").VUnion<"stage_proxy" | "user_sync", [import("convex/values").VLiteral<"stage_proxy", "required">, import("convex/values").VLiteral<"user_sync", "required">], "required", never>;
        title: import("convex/values").VString<string | undefined, "optional">;
        prompt: import("convex/values").VString<string | undefined, "optional">;
        deviceType: import("convex/values").VUnion<"DEVICE_TYPE_UNSPECIFIED" | "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC" | undefined, [import("convex/values").VLiteral<"DEVICE_TYPE_UNSPECIFIED", "required">, import("convex/values").VLiteral<"MOBILE", "required">, import("convex/values").VLiteral<"DESKTOP", "required">, import("convex/values").VLiteral<"TABLET", "required">, import("convex/values").VLiteral<"AGNOSTIC", "required">], "optional", never>;
        modelId: import("convex/values").VUnion<"MODEL_ID_UNSPECIFIED" | "GEMINI_3_PRO" | "GEMINI_3_FLASH" | undefined, [import("convex/values").VLiteral<"MODEL_ID_UNSPECIFIED", "required">, import("convex/values").VLiteral<"GEMINI_3_PRO", "required">, import("convex/values").VLiteral<"GEMINI_3_FLASH", "required">], "optional", never>;
        stitchProjectId: import("convex/values").VString<string | undefined, "optional">;
        stitchScreenId: import("convex/values").VString<string | undefined, "optional">;
        stitchScreenUrl: import("convex/values").VString<string | undefined, "optional">;
        r2ObjectKey: import("convex/values").VString<string, "required">;
        sortOrder: import("convex/values").VFloat64<number | undefined, "optional">;
        status: import("convex/values").VUnion<"error" | "ready", [import("convex/values").VLiteral<"ready", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "projectId" | "createdAt" | "updatedAt" | "userId" | "phaseId" | "title" | "r2ObjectKey" | "provider" | "lastSyncedAt" | "source" | "prompt" | "deviceType" | "modelId" | "stitchProjectId" | "stitchScreenId" | "stitchScreenUrl" | "sortOrder" | "errorMessage">, {
        by_project: ["projectId", "_creationTime"];
        by_project_createdAt: ["projectId", "createdAt", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_project_screen: ["projectId", "stitchScreenId", "_creationTime"];
    }, {}, {}>;
    projectCollaborators: import("convex/server").TableDefinition<import("convex/values").VObject<{
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        role: "editor";
        addedBy: import("convex/values").GenericId<"users">;
    }, {
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        role: import("convex/values").VLiteral<"editor", "required">;
        addedBy: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "projectId" | "createdAt" | "userId" | "role" | "addedBy">, {
        by_project: ["projectId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_project_user: ["projectId", "userId", "_creationTime"];
    }, {}, {}>;
    portalConfigs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        logoUrl?: string | undefined;
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        updatedAt: number;
        shareToken: string;
        shareUrl: string;
        isEnabled: boolean;
        accentColor: string;
    }, {
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        isEnabled: import("convex/values").VBoolean<boolean, "required">;
        shareToken: import("convex/values").VString<string, "required">;
        shareUrl: import("convex/values").VString<string, "required">;
        logoUrl: import("convex/values").VString<string | undefined, "optional">;
        accentColor: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "projectId" | "createdAt" | "updatedAt" | "shareToken" | "shareUrl" | "isEnabled" | "logoUrl" | "accentColor">, {
        by_project: ["projectId", "_creationTime"];
        by_share_token: ["shareToken", "_creationTime"];
    }, {}, {}>;
    subscriptions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        cancelAtPeriodEnd?: boolean | undefined;
        paymentMethodBrand?: string | undefined;
        paymentMethodLast4?: string | undefined;
        stripeCustomerId?: string | undefined;
        stripeSubscriptionId?: string | undefined;
        stripePriceId?: string | undefined;
        externalCustomerId?: string | undefined;
        externalSubscriptionId?: string | undefined;
        status: "active" | "trialing" | "cancelling" | "past_due" | "unpaid" | "incomplete" | "canceled" | "expired";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        plan: "free" | "pro";
        provider: "unknown" | "stripe" | "polar" | "creem";
        billingCycle: "monthly" | "yearly";
        currentPeriodEnd: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VUnion<"unknown" | "stripe" | "polar" | "creem", [import("convex/values").VLiteral<"stripe", "required">, import("convex/values").VLiteral<"polar", "required">, import("convex/values").VLiteral<"creem", "required">, import("convex/values").VLiteral<"unknown", "required">], "required", never>;
        plan: import("convex/values").VUnion<"free" | "pro", [import("convex/values").VLiteral<"free", "required">, import("convex/values").VLiteral<"pro", "required">], "required", never>;
        status: import("convex/values").VUnion<"active" | "trialing" | "cancelling" | "past_due" | "unpaid" | "incomplete" | "canceled" | "expired", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"trialing", "required">, import("convex/values").VLiteral<"cancelling", "required">, import("convex/values").VLiteral<"past_due", "required">, import("convex/values").VLiteral<"unpaid", "required">, import("convex/values").VLiteral<"incomplete", "required">, import("convex/values").VLiteral<"canceled", "required">, import("convex/values").VLiteral<"expired", "required">], "required", never>;
        billingCycle: import("convex/values").VUnion<"monthly" | "yearly", [import("convex/values").VLiteral<"monthly", "required">, import("convex/values").VLiteral<"yearly", "required">], "required", never>;
        currentPeriodEnd: import("convex/values").VFloat64<number, "required">;
        cancelAtPeriodEnd: import("convex/values").VBoolean<boolean | undefined, "optional">;
        paymentMethodBrand: import("convex/values").VString<string | undefined, "optional">;
        paymentMethodLast4: import("convex/values").VString<string | undefined, "optional">;
        stripeCustomerId: import("convex/values").VString<string | undefined, "optional">;
        stripeSubscriptionId: import("convex/values").VString<string | undefined, "optional">;
        stripePriceId: import("convex/values").VString<string | undefined, "optional">;
        externalCustomerId: import("convex/values").VString<string | undefined, "optional">;
        externalSubscriptionId: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "plan" | "provider" | "billingCycle" | "currentPeriodEnd" | "cancelAtPeriodEnd" | "paymentMethodBrand" | "paymentMethodLast4" | "stripeCustomerId" | "stripeSubscriptionId" | "stripePriceId" | "externalCustomerId" | "externalSubscriptionId">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    paymentConnections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastSyncedAt?: number | undefined;
        externalAccountId?: string | undefined;
        credentialLabel?: string | undefined;
        credentialLast4?: string | undefined;
        displayName?: string | undefined;
        accountEmail?: string | undefined;
        connectedAt?: number | undefined;
        lastSyncCursor?: string | undefined;
        lastSyncError?: string | undefined;
        oauthState?: string | undefined;
        status: "error" | "active" | "pending" | "disconnected";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        provider: "unknown" | "stripe";
        accessMode: "restricted_key" | "connect";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VUnion<"unknown" | "stripe", [import("convex/values").VLiteral<"stripe", "required">, import("convex/values").VLiteral<"unknown", "required">], "required", never>;
        accessMode: import("convex/values").VUnion<"restricted_key" | "connect", [import("convex/values").VLiteral<"restricted_key", "required">, import("convex/values").VLiteral<"connect", "required">], "required", never>;
        status: import("convex/values").VUnion<"error" | "active" | "pending" | "disconnected", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"error", "required">, import("convex/values").VLiteral<"disconnected", "required">], "required", never>;
        externalAccountId: import("convex/values").VString<string | undefined, "optional">;
        credentialLabel: import("convex/values").VString<string | undefined, "optional">;
        credentialLast4: import("convex/values").VString<string | undefined, "optional">;
        displayName: import("convex/values").VString<string | undefined, "optional">;
        accountEmail: import("convex/values").VString<string | undefined, "optional">;
        connectedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastSyncCursor: import("convex/values").VString<string | undefined, "optional">;
        lastSyncError: import("convex/values").VString<string | undefined, "optional">;
        oauthState: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "provider" | "lastSyncedAt" | "accessMode" | "externalAccountId" | "credentialLabel" | "credentialLast4" | "displayName" | "accountEmail" | "connectedAt" | "lastSyncCursor" | "lastSyncError" | "oauthState">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
        by_oauth_state: ["oauthState", "_creationTime"];
    }, {}, {}>;
    agentConnections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        displayName?: string | undefined;
        connectedAt?: number | undefined;
        apiKeyId?: import("convex/values").GenericId<"apiKeys"> | undefined;
        lastSeenAt?: number | undefined;
        lastHandshakeAt?: number | undefined;
        lastError?: string | undefined;
        status: "error" | "pending" | "disconnected" | "connected";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        provider: "claude";
        source: "onboarding" | "settings";
        client: "claude_code";
        mode: "skill";
        notionInClaude: "unknown" | "claimed";
        figmaInClaude: "unknown" | "claimed";
        stageApiVerified: boolean;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VLiteral<"claude", "required">;
        client: import("convex/values").VLiteral<"claude_code", "required">;
        mode: import("convex/values").VLiteral<"skill", "required">;
        status: import("convex/values").VUnion<"error" | "pending" | "disconnected" | "connected", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"connected", "required">, import("convex/values").VLiteral<"error", "required">, import("convex/values").VLiteral<"disconnected", "required">], "required", never>;
        displayName: import("convex/values").VString<string | undefined, "optional">;
        apiKeyId: import("convex/values").VId<import("convex/values").GenericId<"apiKeys"> | undefined, "optional">;
        source: import("convex/values").VUnion<"onboarding" | "settings", [import("convex/values").VLiteral<"onboarding", "required">, import("convex/values").VLiteral<"settings", "required">], "required", never>;
        stageApiVerified: import("convex/values").VBoolean<boolean, "required">;
        notionInClaude: import("convex/values").VUnion<"unknown" | "claimed", [import("convex/values").VLiteral<"unknown", "required">, import("convex/values").VLiteral<"claimed", "required">], "required", never>;
        figmaInClaude: import("convex/values").VUnion<"unknown" | "claimed", [import("convex/values").VLiteral<"unknown", "required">, import("convex/values").VLiteral<"claimed", "required">], "required", never>;
        connectedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastSeenAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastHandshakeAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastError: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "provider" | "source" | "displayName" | "connectedAt" | "client" | "mode" | "notionInClaude" | "figmaInClaude" | "apiKeyId" | "stageApiVerified" | "lastSeenAt" | "lastHandshakeAt" | "lastError">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider_client: ["userId", "provider", "client", "_creationTime"];
    }, {}, {}>;
    nativeIntegrationConnections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastSyncedAt?: number | undefined;
        displayName?: string | undefined;
        accountEmail?: string | undefined;
        connectedAt?: number | undefined;
        oauthState?: string | undefined;
        lastError?: string | undefined;
        workspaceId?: string | undefined;
        workspaceName?: string | undefined;
        workspaceIcon?: string | undefined;
        accountId?: string | undefined;
        accountName?: string | undefined;
        accountAvatarUrl?: string | undefined;
        encryptedTokenPayload?: string | undefined;
        encryptionIv?: string | undefined;
        accessTokenExpiresAt?: number | undefined;
        scopes?: string[] | undefined;
        pkceVerifier?: string | undefined;
        oauthReturnUrl?: string | undefined;
        defaultParentPageId?: string | undefined;
        defaultParentPageUrl?: string | undefined;
        status: "error" | "active" | "pending" | "disconnected";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        provider: "figma" | "notion";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VUnion<"figma" | "notion", [import("convex/values").VLiteral<"notion", "required">, import("convex/values").VLiteral<"figma", "required">], "required", never>;
        status: import("convex/values").VUnion<"error" | "active" | "pending" | "disconnected", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"error", "required">, import("convex/values").VLiteral<"disconnected", "required">], "required", never>;
        displayName: import("convex/values").VString<string | undefined, "optional">;
        workspaceId: import("convex/values").VString<string | undefined, "optional">;
        workspaceName: import("convex/values").VString<string | undefined, "optional">;
        workspaceIcon: import("convex/values").VString<string | undefined, "optional">;
        accountId: import("convex/values").VString<string | undefined, "optional">;
        accountEmail: import("convex/values").VString<string | undefined, "optional">;
        accountName: import("convex/values").VString<string | undefined, "optional">;
        accountAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        encryptedTokenPayload: import("convex/values").VString<string | undefined, "optional">;
        encryptionIv: import("convex/values").VString<string | undefined, "optional">;
        accessTokenExpiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        scopes: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        oauthState: import("convex/values").VString<string | undefined, "optional">;
        pkceVerifier: import("convex/values").VString<string | undefined, "optional">;
        oauthReturnUrl: import("convex/values").VString<string | undefined, "optional">;
        connectedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastError: import("convex/values").VString<string | undefined, "optional">;
        defaultParentPageId: import("convex/values").VString<string | undefined, "optional">;
        defaultParentPageUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "provider" | "lastSyncedAt" | "displayName" | "accountEmail" | "connectedAt" | "oauthState" | "lastError" | "workspaceId" | "workspaceName" | "workspaceIcon" | "accountId" | "accountName" | "accountAvatarUrl" | "encryptedTokenPayload" | "encryptionIv" | "accessTokenExpiresAt" | "scopes" | "pkceVerifier" | "oauthReturnUrl" | "defaultParentPageId" | "defaultParentPageUrl">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
        by_oauth_state: ["oauthState", "_creationTime"];
    }, {}, {}>;
    aiProviderCredentials: import("convex/server").TableDefinition<import("convex/values").VObject<{
        modelPreference?: string | undefined;
        testedAt?: number | undefined;
        status: "untested" | "valid" | "invalid";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        provider: "anthropic";
        encryptionIv: string;
        label: "claude";
        encryptedApiKey: string;
        keyLast4: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VLiteral<"anthropic", "required">;
        label: import("convex/values").VLiteral<"claude", "required">;
        encryptedApiKey: import("convex/values").VString<string, "required">;
        encryptionIv: import("convex/values").VString<string, "required">;
        keyLast4: import("convex/values").VString<string, "required">;
        modelPreference: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"untested" | "valid" | "invalid", [import("convex/values").VLiteral<"untested", "required">, import("convex/values").VLiteral<"valid", "required">, import("convex/values").VLiteral<"invalid", "required">], "required", never>;
        testedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "provider" | "encryptionIv" | "label" | "encryptedApiKey" | "keyLast4" | "modelPreference" | "testedAt">, {
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
    }, {}, {}>;
    projectAiContexts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        brief?: string | undefined;
        industry?: string | undefined;
        clientWebsite?: string | undefined;
        briefAttachmentName?: string | undefined;
        briefAttachmentR2ObjectKey?: string | undefined;
        notes?: string | undefined;
        strategyFocusAreas?: string[] | undefined;
        strategyGenerateNotes?: string | undefined;
        lastProviderId?: "claude" | "codex" | undefined;
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        competitorUrls: string[];
        referenceUrls: string[];
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        industry: import("convex/values").VString<string | undefined, "optional">;
        clientWebsite: import("convex/values").VString<string | undefined, "optional">;
        competitorUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        referenceUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        brief: import("convex/values").VString<string | undefined, "optional">;
        briefAttachmentName: import("convex/values").VString<string | undefined, "optional">;
        briefAttachmentR2ObjectKey: import("convex/values").VString<string | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        strategyFocusAreas: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        strategyGenerateNotes: import("convex/values").VString<string | undefined, "optional">;
        lastProviderId: import("convex/values").VUnion<"claude" | "codex" | undefined, [import("convex/values").VLiteral<"claude", "required">, import("convex/values").VLiteral<"codex", "required">], "optional", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "projectId" | "createdAt" | "updatedAt" | "userId" | "brief" | "industry" | "clientWebsite" | "competitorUrls" | "referenceUrls" | "briefAttachmentName" | "briefAttachmentR2ObjectKey" | "notes" | "strategyFocusAreas" | "strategyGenerateNotes" | "lastProviderId">, {
        by_user: ["userId", "_creationTime"];
        by_project: ["projectId", "_creationTime"];
        by_user_project: ["userId", "projectId", "_creationTime"];
    }, {}, {}>;
    projectAiRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string | undefined;
        connectionId?: import("convex/values").GenericId<"agentConnections"> | undefined;
        externalRunId?: string | undefined;
        inputSummary?: string | undefined;
        completedAt?: number | undefined;
        status: "completed" | "draft" | "failed" | "running" | "needs_input";
        projectId: import("convex/values").GenericId<"projects">;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        title: string;
        module: "strategy" | "research" | "flows" | "moodboard" | "generate" | "delivery";
        trigger: "user" | "agent";
        startedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        connectionId: import("convex/values").VId<import("convex/values").GenericId<"agentConnections"> | undefined, "optional">;
        module: import("convex/values").VUnion<"strategy" | "research" | "flows" | "moodboard" | "generate" | "delivery", [import("convex/values").VLiteral<"research", "required">, import("convex/values").VLiteral<"strategy", "required">, import("convex/values").VLiteral<"flows", "required">, import("convex/values").VLiteral<"moodboard", "required">, import("convex/values").VLiteral<"generate", "required">, import("convex/values").VLiteral<"delivery", "required">], "required", never>;
        title: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"completed" | "draft" | "failed" | "running" | "needs_input", [import("convex/values").VLiteral<"draft", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"needs_input", "required">], "required", never>;
        trigger: import("convex/values").VUnion<"user" | "agent", [import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"agent", "required">], "required", never>;
        externalRunId: import("convex/values").VString<string | undefined, "optional">;
        inputSummary: import("convex/values").VString<string | undefined, "optional">;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "projectId" | "updatedAt" | "userId" | "title" | "errorMessage" | "module" | "trigger" | "connectionId" | "externalRunId" | "inputSummary" | "startedAt" | "completedAt">, {
        by_project: ["projectId", "_creationTime"];
        by_project_module: ["projectId", "module", "_creationTime"];
        by_project_startedAt: ["projectId", "startedAt", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    projectAiArtifacts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        summary?: string | undefined;
        runId?: import("convex/values").GenericId<"projectAiRuns"> | undefined;
        contentMarkdown?: string | undefined;
        contentJson?: string | undefined;
        externalUrl?: string | undefined;
        approvedAt?: number | undefined;
        status: "ready" | "draft" | "failed" | "approved" | "superseded";
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        title: string;
        kind: string;
        module: "strategy" | "research" | "flows" | "moodboard" | "generate" | "delivery";
        contentFormat: "markdown" | "json" | "link_set";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        runId: import("convex/values").VId<import("convex/values").GenericId<"projectAiRuns"> | undefined, "optional">;
        module: import("convex/values").VUnion<"strategy" | "research" | "flows" | "moodboard" | "generate" | "delivery", [import("convex/values").VLiteral<"research", "required">, import("convex/values").VLiteral<"strategy", "required">, import("convex/values").VLiteral<"flows", "required">, import("convex/values").VLiteral<"moodboard", "required">, import("convex/values").VLiteral<"generate", "required">, import("convex/values").VLiteral<"delivery", "required">], "required", never>;
        kind: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        summary: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"ready" | "draft" | "failed" | "approved" | "superseded", [import("convex/values").VLiteral<"draft", "required">, import("convex/values").VLiteral<"ready", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"superseded", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        contentFormat: import("convex/values").VUnion<"markdown" | "json" | "link_set", [import("convex/values").VLiteral<"markdown", "required">, import("convex/values").VLiteral<"json", "required">, import("convex/values").VLiteral<"link_set", "required">], "required", never>;
        contentMarkdown: import("convex/values").VString<string | undefined, "optional">;
        contentJson: import("convex/values").VString<string | undefined, "optional">;
        externalUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        approvedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "projectId" | "createdAt" | "updatedAt" | "userId" | "title" | "summary" | "kind" | "module" | "contentFormat" | "runId" | "contentMarkdown" | "contentJson" | "externalUrl" | "approvedAt">, {
        by_project: ["projectId", "_creationTime"];
        by_project_module: ["projectId", "module", "_creationTime"];
        by_run: ["runId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    artifactDestinations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastSyncedAt?: number | undefined;
        errorMessage?: string | undefined;
        destinationLabel?: string | undefined;
        destinationUrl?: string | undefined;
        status: "completed" | "in_progress" | "failed" | "requested";
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        provider: "figma" | "notion";
        requestedVia: "claude" | "native";
        artifactId: import("convex/values").GenericId<"projectAiArtifacts">;
        action: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        artifactId: import("convex/values").VId<import("convex/values").GenericId<"projectAiArtifacts">, "required">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        provider: import("convex/values").VUnion<"figma" | "notion", [import("convex/values").VLiteral<"notion", "required">, import("convex/values").VLiteral<"figma", "required">], "required", never>;
        action: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"completed" | "in_progress" | "failed" | "requested", [import("convex/values").VLiteral<"requested", "required">, import("convex/values").VLiteral<"in_progress", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        destinationLabel: import("convex/values").VString<string | undefined, "optional">;
        destinationUrl: import("convex/values").VString<string | undefined, "optional">;
        requestedVia: import("convex/values").VUnion<"claude" | "native", [import("convex/values").VLiteral<"claude", "required">, import("convex/values").VLiteral<"native", "required">], "required", never>;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "projectId" | "createdAt" | "updatedAt" | "userId" | "provider" | "lastSyncedAt" | "errorMessage" | "requestedVia" | "artifactId" | "action" | "destinationLabel" | "destinationUrl">, {
        by_artifact: ["artifactId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_user_provider: ["userId", "provider", "_creationTime"];
        by_project: ["projectId", "_creationTime"];
        by_project_provider: ["projectId", "provider", "_creationTime"];
    }, {}, {}>;
    figmaExportJobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string | undefined;
        completedAt?: number | undefined;
        destinationUrl?: string | undefined;
        exportKind?: "wireframe" | "figjam_flow_map" | undefined;
        claimedFigmaUserId?: string | undefined;
        claimTokenHash?: string | undefined;
        claimExpiresAt?: number | undefined;
        destinationFileName?: string | undefined;
        destinationNodeId?: string | undefined;
        status: "completed" | "failed" | "claimed" | "requested";
        projectId: import("convex/values").GenericId<"projects">;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        artifactId: import("convex/values").GenericId<"projectAiArtifacts">;
        screenId: string;
        figmaAccountId: string;
        writePlanJson: string;
        pairingCodeHash: string;
        pairingExpiresAt: number;
        attemptCount: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects">, "required">;
        artifactId: import("convex/values").VId<import("convex/values").GenericId<"projectAiArtifacts">, "required">;
        screenId: import("convex/values").VString<string, "required">;
        exportKind: import("convex/values").VUnion<"wireframe" | "figjam_flow_map" | undefined, [import("convex/values").VLiteral<"wireframe", "required">, import("convex/values").VLiteral<"figjam_flow_map", "required">], "optional", never>;
        figmaAccountId: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"completed" | "failed" | "claimed" | "requested", [import("convex/values").VLiteral<"requested", "required">, import("convex/values").VLiteral<"claimed", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        writePlanJson: import("convex/values").VString<string, "required">;
        pairingCodeHash: import("convex/values").VString<string, "required">;
        pairingExpiresAt: import("convex/values").VFloat64<number, "required">;
        claimedFigmaUserId: import("convex/values").VString<string | undefined, "optional">;
        claimTokenHash: import("convex/values").VString<string | undefined, "optional">;
        claimExpiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        destinationFileName: import("convex/values").VString<string | undefined, "optional">;
        destinationNodeId: import("convex/values").VString<string | undefined, "optional">;
        destinationUrl: import("convex/values").VString<string | undefined, "optional">;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        attemptCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "projectId" | "createdAt" | "updatedAt" | "userId" | "errorMessage" | "completedAt" | "artifactId" | "destinationUrl" | "screenId" | "exportKind" | "figmaAccountId" | "writePlanJson" | "pairingCodeHash" | "pairingExpiresAt" | "claimedFigmaUserId" | "claimTokenHash" | "claimExpiresAt" | "destinationFileName" | "destinationNodeId" | "attemptCount">, {
        by_artifact_screen: ["artifactId", "screenId", "_creationTime"];
        by_pairing_hash: ["pairingCodeHash", "_creationTime"];
        by_claim_hash: ["claimTokenHash", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_project: ["projectId", "_creationTime"];
    }, {}, {}>;
    invoices: import("convex/server").TableDefinition<import("convex/values").VObject<{
        number?: string | undefined;
        dueAt?: number | undefined;
        paidAt?: number | undefined;
        hostedInvoiceUrl?: string | undefined;
        status: "void" | "draft" | "open" | "paid" | "overdue";
        createdAt: number;
        updatedAt: number;
        clientName: string;
        userId: import("convex/values").GenericId<"users">;
        paymentConnectionId: import("convex/values").GenericId<"paymentConnections">;
        externalInvoiceId: string;
        currency: string;
        totalAmount: number;
        amountDue: number;
        issuedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        paymentConnectionId: import("convex/values").VId<import("convex/values").GenericId<"paymentConnections">, "required">;
        externalInvoiceId: import("convex/values").VString<string, "required">;
        number: import("convex/values").VString<string | undefined, "optional">;
        clientName: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"void" | "draft" | "open" | "paid" | "overdue", [import("convex/values").VLiteral<"draft", "required">, import("convex/values").VLiteral<"open", "required">, import("convex/values").VLiteral<"paid", "required">, import("convex/values").VLiteral<"overdue", "required">, import("convex/values").VLiteral<"void", "required">], "required", never>;
        currency: import("convex/values").VString<string, "required">;
        totalAmount: import("convex/values").VFloat64<number, "required">;
        amountDue: import("convex/values").VFloat64<number, "required">;
        issuedAt: import("convex/values").VFloat64<number, "required">;
        dueAt: import("convex/values").VFloat64<number | undefined, "optional">;
        paidAt: import("convex/values").VFloat64<number | undefined, "optional">;
        hostedInvoiceUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "number" | "status" | "createdAt" | "updatedAt" | "clientName" | "userId" | "paymentConnectionId" | "externalInvoiceId" | "currency" | "totalAmount" | "amountDue" | "issuedAt" | "dueAt" | "paidAt" | "hostedInvoiceUrl">, {
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_connection: ["paymentConnectionId", "_creationTime"];
        by_connection_external: ["paymentConnectionId", "externalInvoiceId", "_creationTime"];
    }, {}, {}>;
    payments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        invoiceId?: import("convex/values").GenericId<"invoices"> | undefined;
        status: "pending" | "succeeded" | "failed";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        paymentConnectionId: import("convex/values").GenericId<"paymentConnections">;
        currency: string;
        externalPaymentId: string;
        amount: number;
        receivedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        paymentConnectionId: import("convex/values").VId<import("convex/values").GenericId<"paymentConnections">, "required">;
        invoiceId: import("convex/values").VId<import("convex/values").GenericId<"invoices"> | undefined, "optional">;
        externalPaymentId: import("convex/values").VString<string, "required">;
        currency: import("convex/values").VString<string, "required">;
        amount: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VUnion<"pending" | "succeeded" | "failed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"succeeded", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        receivedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "paymentConnectionId" | "currency" | "invoiceId" | "externalPaymentId" | "amount" | "receivedAt">, {
        by_user: ["userId", "_creationTime"];
        by_invoice: ["invoiceId", "_creationTime"];
        by_connection: ["paymentConnectionId", "_creationTime"];
        by_connection_external: ["paymentConnectionId", "externalPaymentId", "_creationTime"];
    }, {}, {}>;
    sheetConnections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        storageId?: import("convex/values").GenericId<"_storage"> | undefined;
        r2ObjectKey?: string | undefined;
        fileName?: string | undefined;
        sheetId?: string | undefined;
        sheetUrl?: string | undefined;
        sheetTitle?: string | undefined;
        templateVersion?: string | undefined;
        lastImportedAt?: number | undefined;
        lastImportStatus?: "error" | "success" | "running" | undefined;
        lastImportError?: string | undefined;
        status: "error" | "active" | "pending" | "disconnected";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        sourceType: "google_sheet" | "csv_upload";
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        sourceType: import("convex/values").VUnion<"google_sheet" | "csv_upload", [import("convex/values").VLiteral<"google_sheet", "required">, import("convex/values").VLiteral<"csv_upload", "required">], "required", never>;
        status: import("convex/values").VUnion<"error" | "active" | "pending" | "disconnected", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"error", "required">, import("convex/values").VLiteral<"disconnected", "required">], "required", never>;
        sheetId: import("convex/values").VString<string | undefined, "optional">;
        sheetUrl: import("convex/values").VString<string | undefined, "optional">;
        sheetTitle: import("convex/values").VString<string | undefined, "optional">;
        storageId: import("convex/values").VId<import("convex/values").GenericId<"_storage"> | undefined, "optional">;
        r2ObjectKey: import("convex/values").VString<string | undefined, "optional">;
        fileName: import("convex/values").VString<string | undefined, "optional">;
        templateVersion: import("convex/values").VString<string | undefined, "optional">;
        lastImportedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastImportStatus: import("convex/values").VUnion<"error" | "success" | "running" | undefined, [import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"success", "required">, import("convex/values").VLiteral<"error", "required">], "optional", never>;
        lastImportError: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "storageId" | "r2ObjectKey" | "fileName" | "sourceType" | "sheetId" | "sheetUrl" | "sheetTitle" | "templateVersion" | "lastImportedAt" | "lastImportStatus" | "lastImportError">, {
        by_user: ["userId", "_creationTime"];
        by_user_source_type: ["userId", "sourceType", "_creationTime"];
        by_sheet_id: ["sheetId", "_creationTime"];
    }, {}, {}>;
    sheetImportRuns: import("convex/server").TableDefinition<import("convex/values").VObject<{
        finishedAt?: number | undefined;
        errorSummary?: string | undefined;
        status: "error" | "success" | "running";
        userId: import("convex/values").GenericId<"users">;
        startedAt: number;
        sheetConnectionId: import("convex/values").GenericId<"sheetConnections">;
        importedCount: number;
        updatedCount: number;
        skippedCount: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        sheetConnectionId: import("convex/values").VId<import("convex/values").GenericId<"sheetConnections">, "required">;
        status: import("convex/values").VUnion<"error" | "success" | "running", [import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"success", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        startedAt: import("convex/values").VFloat64<number, "required">;
        finishedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        importedCount: import("convex/values").VFloat64<number, "required">;
        updatedCount: import("convex/values").VFloat64<number, "required">;
        skippedCount: import("convex/values").VFloat64<number, "required">;
        errorSummary: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "userId" | "startedAt" | "sheetConnectionId" | "finishedAt" | "importedCount" | "updatedCount" | "skippedCount" | "errorSummary">, {
        by_user: ["userId", "_creationTime"];
        by_connection: ["sheetConnectionId", "_creationTime"];
    }, {}, {}>;
    financeEntries: import("convex/server").TableDefinition<import("convex/values").VObject<{
        projectId?: import("convex/values").GenericId<"projects"> | undefined;
        notes?: string | undefined;
        paymentConnectionId?: import("convex/values").GenericId<"paymentConnections"> | undefined;
        dueAt?: number | undefined;
        paidAt?: number | undefined;
        sheetConnectionId?: import("convex/values").GenericId<"sheetConnections"> | undefined;
        rawLabel?: string | undefined;
        status: "pending" | "draft" | "paid" | "overdue" | "failed";
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        source: "google_sheet" | "csv_upload" | "stripe_connect";
        currency: string;
        entryType: "invoice" | "payment" | "expense" | "refund" | "adjustment";
        direction: "incoming" | "outgoing";
        sourceRecordId: string;
        counterpartyName: string;
        amountCents: number;
        occurredAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        source: import("convex/values").VUnion<"google_sheet" | "csv_upload" | "stripe_connect", [import("convex/values").VLiteral<"stripe_connect", "required">, import("convex/values").VLiteral<"google_sheet", "required">, import("convex/values").VLiteral<"csv_upload", "required">], "required", never>;
        paymentConnectionId: import("convex/values").VId<import("convex/values").GenericId<"paymentConnections"> | undefined, "optional">;
        sheetConnectionId: import("convex/values").VId<import("convex/values").GenericId<"sheetConnections"> | undefined, "optional">;
        sourceRecordId: import("convex/values").VString<string, "required">;
        entryType: import("convex/values").VUnion<"invoice" | "payment" | "expense" | "refund" | "adjustment", [import("convex/values").VLiteral<"invoice", "required">, import("convex/values").VLiteral<"payment", "required">, import("convex/values").VLiteral<"expense", "required">, import("convex/values").VLiteral<"refund", "required">, import("convex/values").VLiteral<"adjustment", "required">], "required", never>;
        direction: import("convex/values").VUnion<"incoming" | "outgoing", [import("convex/values").VLiteral<"incoming", "required">, import("convex/values").VLiteral<"outgoing", "required">], "required", never>;
        status: import("convex/values").VUnion<"pending" | "draft" | "paid" | "overdue" | "failed", [import("convex/values").VLiteral<"draft", "required">, import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"paid", "required">, import("convex/values").VLiteral<"overdue", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        counterpartyName: import("convex/values").VString<string, "required">;
        amountCents: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        occurredAt: import("convex/values").VFloat64<number, "required">;
        dueAt: import("convex/values").VFloat64<number | undefined, "optional">;
        paidAt: import("convex/values").VFloat64<number | undefined, "optional">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects"> | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        rawLabel: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "projectId" | "createdAt" | "updatedAt" | "userId" | "source" | "notes" | "paymentConnectionId" | "currency" | "dueAt" | "paidAt" | "sheetConnectionId" | "entryType" | "direction" | "sourceRecordId" | "counterpartyName" | "amountCents" | "occurredAt" | "rawLabel">, {
        by_user: ["userId", "_creationTime"];
        by_user_source_record: ["userId", "source", "sourceRecordId", "_creationTime"];
        by_payment_connection: ["paymentConnectionId", "_creationTime"];
        by_sheet_connection: ["sheetConnectionId", "_creationTime"];
    }, {}, {}>;
    apiKeys: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastUsedAt?: number | undefined;
        revokedAt?: number | undefined;
        name: string;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        hashedKey: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        hashedKey: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        lastUsedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        revokedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "name" | "createdAt" | "userId" | "hashedKey" | "lastUsedAt" | "revokedAt">, {
        by_hashed_key: ["hashedKey", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    uploadedAssets: import("convex/server").TableDefinition<import("convex/values").VObject<{
        status?: string | undefined;
        updatedAt?: number | undefined;
        source?: string | undefined;
        entityType?: string | undefined;
        entityId?: string | undefined;
        attachedAt?: number | undefined;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        fileName: string;
        fileSize: number;
        mimeType: string;
        purpose: "task-attachment" | "csv-upload" | "profile-avatar" | "client-avatar" | "project-marker" | "portal-logo" | "generated-design" | "project-asset" | "research-refero" | "research-brief" | "moodboard-upload" | "moodboard-refero" | "moodboard-figma" | "moodboard-url";
        key: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        key: import("convex/values").VString<string, "required">;
        purpose: import("convex/values").VUnion<"task-attachment" | "csv-upload" | "profile-avatar" | "client-avatar" | "project-marker" | "portal-logo" | "generated-design" | "project-asset" | "research-refero" | "research-brief" | "moodboard-upload" | "moodboard-refero" | "moodboard-figma" | "moodboard-url", [import("convex/values").VLiteral<"task-attachment", "required">, import("convex/values").VLiteral<"csv-upload", "required">, import("convex/values").VLiteral<"profile-avatar", "required">, import("convex/values").VLiteral<"client-avatar", "required">, import("convex/values").VLiteral<"project-marker", "required">, import("convex/values").VLiteral<"portal-logo", "required">, import("convex/values").VLiteral<"generated-design", "required">, import("convex/values").VLiteral<"project-asset", "required">, import("convex/values").VLiteral<"research-refero", "required">, import("convex/values").VLiteral<"research-brief", "required">, import("convex/values").VLiteral<"moodboard-upload", "required">, import("convex/values").VLiteral<"moodboard-refero", "required">, import("convex/values").VLiteral<"moodboard-figma", "required">, import("convex/values").VLiteral<"moodboard-url", "required">], "required", never>;
        fileName: import("convex/values").VString<string, "required">;
        fileSize: import("convex/values").VFloat64<number, "required">;
        mimeType: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VString<string | undefined, "optional">;
        source: import("convex/values").VString<string | undefined, "optional">;
        entityType: import("convex/values").VString<string | undefined, "optional">;
        entityId: import("convex/values").VString<string | undefined, "optional">;
        attachedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "createdAt" | "updatedAt" | "userId" | "fileName" | "fileSize" | "mimeType" | "source" | "purpose" | "key" | "entityType" | "entityId" | "attachedAt">, {
        by_key: ["key", "_creationTime"];
        by_createdAt: ["createdAt", "_creationTime"];
        by_user_createdAt: ["userId", "createdAt", "_creationTime"];
    }, {}, {}>;
    authSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        expirationTime: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "expirationTime">, {
        userId: ["userId", "_creationTime"];
    }, {}, {}>;
    authAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        secret?: string | undefined;
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        userId: import("convex/values").GenericId<"users">;
        provider: string;
        providerAccountId: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VString<string, "required">;
        providerAccountId: import("convex/values").VString<string, "required">;
        secret: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "secret" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified">, {
        userIdAndProvider: ["userId", "provider", "_creationTime"];
        providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
    }, {}, {}>;
    authRefreshTokens: import("convex/server").TableDefinition<import("convex/values").VObject<{
        firstUsedTime?: number | undefined;
        parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
        expirationTime: number;
        sessionId: import("convex/values").GenericId<"authSessions">;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        firstUsedTime: import("convex/values").VFloat64<number | undefined, "optional">;
        parentRefreshTokenId: import("convex/values").VId<import("convex/values").GenericId<"authRefreshTokens"> | undefined, "optional">;
    }, "required", "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId">, {
        sessionId: ["sessionId", "_creationTime"];
        sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
    }, {}, {}>;
    authVerificationCodes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        verifier?: string | undefined;
        expirationTime: number;
        provider: string;
        accountId: import("convex/values").GenericId<"authAccounts">;
        code: string;
    }, {
        accountId: import("convex/values").VId<import("convex/values").GenericId<"authAccounts">, "required">;
        provider: import("convex/values").VString<string, "required">;
        code: import("convex/values").VString<string, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        verifier: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier">, {
        accountId: ["accountId", "_creationTime"];
        code: ["code", "_creationTime"];
    }, {}, {}>;
    authVerifiers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
        signature?: string | undefined;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions"> | undefined, "optional">;
        signature: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "sessionId" | "signature">, {
        signature: ["signature", "_creationTime"];
    }, {}, {}>;
    authRateLimits: import("convex/server").TableDefinition<import("convex/values").VObject<{
        identifier: string;
        lastAttemptTime: number;
        attemptsLeft: number;
    }, {
        identifier: import("convex/values").VString<string, "required">;
        lastAttemptTime: import("convex/values").VFloat64<number, "required">;
        attemptsLeft: import("convex/values").VFloat64<number, "required">;
    }, "required", "identifier" | "lastAttemptTime" | "attemptsLeft">, {
        identifier: ["identifier", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map