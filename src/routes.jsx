import BlinkoAdminPrivacy from "./pages/projects/projectBlinkoAdmin/PrivacyPolicy";
import BlinkoAdmin from "./pages/projects/projectBlinkoAdmin/ProjectBlinkoAdmin";
import ProjectFunnyCalculator from "./pages/projects/projectFunnyCalculator/ProjectFunnyCalculator";
import ProjectFunnyCalculatorPrivacy from "./pages/projects/projectFunnyCalculator/ProjectFunnyCalculatorPrivacy";

import ProjectKinPrivacy from "./pages/projects/projectkin/PrivacyPolicy";
import ProjectKin from "./pages/projects/projectkin/ProjectKin";
import ProjectKinAuthFailed from "./pages/projects/projectkin/ProjectKinAuthFailed";
import ProjectKinAuthSuccess from "./pages/projects/projectkin/ProjectKinAuthSuccess";
import ProjectVaultPrivacy from "./pages/projects/projectVault/PrivacyPolicy";
import ProjectVault from "./pages/projects/projectVault/ProjectVault";
import ProjectVaultAcknowledgement from "./pages/projects/projectVault/ProjectVaultAcknowledgement";

export const projectVaultRoutes = [
    { path: "/projects/project-vault", element: <ProjectVault /> },
    { path: "/projects/project-vault/privacy-policy", element: <ProjectVaultPrivacy /> },
    { path: "/projects/project-vault/acknowledgement", element: <ProjectVaultAcknowledgement /> },
];

export const projectKinRoutes = [
    { path: "/projects/project-kin", element: <ProjectKin /> },
    { path: "/projects/project-kin/privacy-policy", element: <ProjectKinPrivacy /> },
    { path: "/projects/project-kin/auth/success", element: <ProjectKinAuthSuccess /> },
    { path: "/projects/project-kin/auth/failed", element: <ProjectKinAuthFailed /> },
];
export const projectFunnyCalculatorRoutes = [
    { path: "/projects/project-funny-calculator", element: <ProjectFunnyCalculator /> },
    { path: "/projects/project-funny-calculator/privacy-policy", element: <ProjectFunnyCalculatorPrivacy /> },
];
// export const projectEduroRoutes = [
//     { path: "/projects/project-eduro", element: <ProjectKin /> },
//     { path: "/projects/project-eduro/privacy-policy", element: <ProjectKinPrivacy /> },
//     { path: "/projects/project-eduro/auth/success", element: <ProjectKinAuthSuccess /> },
//     { path: "/projects/project-eduro/auth/failed", element: <ProjectKinAuthFailed /> },
// ];
export const projectBlinkoAdminRoutes = [
    { path: "/projects/project-blinko-admin", element: <BlinkoAdmin /> },
    { path: "/projects/project-blinko-admin/privacy-policy", element: <BlinkoAdminPrivacy /> },

];
// export const projectKinRoutes = [
//     { path: "/projects/projectkin", element: <ProjectKin /> },
//     { path: "/projects/projectkin/privacy-policy", element: <ProjectKinPrivacy /> },
//     { path: "/projects/projectkin/auth/success", element: <ProjectKinAuthSuccess /> },
//     { path: "/projects/projectkin/auth/failed", element: <ProjectKinAuthFailed /> },
// ];
// export const projectKinRoutes = [
//     { path: "/projects/projectkin", element: <ProjectKin /> },
//     { path: "/projects/projectkin/privacy-policy", element: <ProjectKinPrivacy /> },
//     { path: "/projects/projectkin/auth/success", element: <ProjectKinAuthSuccess /> },
//     { path: "/projects/projectkin/auth/failed", element: <ProjectKinAuthFailed /> },
// ];
// export const projectKinRoutes = [
//     { path: "/projects/projectkin", element: <ProjectKin /> },
//     { path: "/projects/projectkin/privacy-policy", element: <ProjectKinPrivacy /> },
//     { path: "/projects/projectkin/auth/success", element: <ProjectKinAuthSuccess /> },
//     { path: "/projects/projectkin/auth/failed", element: <ProjectKinAuthFailed /> },
// ];
// export const projectKinRoutes = [
//     { path: "/projects/projectkin", element: <ProjectKin /> },
//     { path: "/projects/projectkin/privacy-policy", element: <ProjectKinPrivacy /> },
//     { path: "/projects/projectkin/auth/success", element: <ProjectKinAuthSuccess /> },
//     { path: "/projects/projectkin/auth/failed", element: <ProjectKinAuthFailed /> },
// ];
// export const projectKinRoutes = [
//     { path: "/projects/projectkin", element: <ProjectKin /> },
//     { path: "/projects/projectkin/privacy-policy", element: <ProjectKinPrivacy /> },
//     { path: "/projects/projectkin/auth/success", element: <ProjectKinAuthSuccess /> },
//     { path: "/projects/projectkin/auth/failed", element: <ProjectKinAuthFailed /> },
// ];
// export const projectKinRoutes = [
//     { path: "/projects/projectkin", element: <ProjectKin /> },
//     { path: "/projects/projectkin/privacy-policy", element: <ProjectKinPrivacy /> },
//     { path: "/projects/projectkin/auth/success", element: <ProjectKinAuthSuccess /> },
//     { path: "/projects/projectkin/auth/failed", element: <ProjectKinAuthFailed /> },
// ];
