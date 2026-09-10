import { useState } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { GuestOnly } from "./components/GuestOnly";
import { RequireAuth } from "./components/RequireAuth";
import { Layout } from "./components/Layout";
import { FeatureGate } from "./components/FeatureGate";
import { ReferralCapture } from "./components/ReferralCapture";
import { RequireCreator } from "./components/RequireCreator";
import { WatchGate } from "./components/WatchGate";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { VerifyEmail } from "./pages/VerifyEmail";
import { AuthConfirm } from "./pages/AuthConfirm";
import { NotFound } from "./pages/NotFound";
import { Admin } from "./pages/Admin";
import { LegalPage } from "./pages/Legal";
import { CreatorMore } from "./pages/CreatorMore";
import type { AppMode } from "./types";

import { Home } from "@features/home";
import { Explore, Clips, ClipNew } from "@features/discover";
import { Login, Signup, Profile, PublicProfile, ProfileSettings, AppSettings, Inbox, Saved } from "@features/user";
import {
  CreatorDashboard,
  CreatorTitles,
  CreatorUpload,
  CreatorLives,
  CreatorAnalytics,
  CreatorMonetization,
} from "@features/creator";
import { TitleDetail, TitleWatch, EpisodePlayer } from "@features/film";
import { PremiereList, PremierePlayer, PremiereRedeem, CreatorPremiere, MyTicketsPage } from "@features/premiere";
import { WatchHub, ProfileLive } from "@features/live";
import { GoLive } from "./pages/GoLive";

export default function App() {
  const [mode, setMode] = useState<AppMode>("fan");

  return (
    <>
      <ReferralCapture />
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <ForgotPassword />
            </GuestOnly>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />

        <Route element={<RequireAuth />}>
          <Route element={<Layout mode={mode} onModeChange={setMode} />}>
            <Route
              path="/"
              element={
                mode === "fan" ? (
                  <Home />
                ) : (
                  <CreatorDashboard />
                )
              }
            />
            <Route
              path="/explore"
              element={
                <FeatureGate flag="explore">
                  <Explore />
                </FeatureGate>
              }
            />
            <Route path="/premieres" element={<Navigate to="/" replace />} />
            <Route
              path="/my-tickets"
              element={
                <FeatureGate flag="premiere">
                  <MyTicketsPage />
                </FeatureGate>
              }
            />
            <Route path="/watch/tickets" element={<Navigate to="/my-tickets" replace />} />
            <Route
              path="/watch/*"
              element={
                <WatchGate>
                  <WatchHub />
                </WatchGate>
              }
            />
            <Route
              path="/premiere"
              element={
                <FeatureGate flag="premiere">
                  <Navigate to="/watch/premiere" replace />
                </FeatureGate>
              }
            />
            <Route
              path="/premiere/:id"
              element={
                <FeatureGate flag="premiere">
                  <PremierePlayer />
                </FeatureGate>
              }
            />
            <Route path="/title/:slug" element={<TitleDetail />} />
            <Route path="/title/:slug/watch" element={<TitleWatch />} />
            <Route path="/title/:slug/episode/:episodeId" element={<EpisodePlayer />} />
            <Route path="/saved" element={<Saved />} />
            <Route
              path="/live"
              element={
                <FeatureGate flag="live">
                  <Navigate to="/watch/live" replace />
                </FeatureGate>
              }
            />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<AppSettings />} />
            <Route path="/profile/settings" element={<ProfileSettings />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/inbox/:conversationId" element={<Inbox />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="/u/:username/live" element={<ProfileLive />} />
            <Route path="/go-live" element={<GoLive />} />
            <Route
              path="/clips"
              element={
                <FeatureGate flag="clips">
                  <Clips />
                </FeatureGate>
              }
            />
            <Route
              path="/clips/new"
              element={
                <FeatureGate flag="clips">
                  <ClipNew />
                </FeatureGate>
              }
            />
            <Route path="/legal/terms" element={<LegalPage kind="terms" />} />
            <Route path="/legal/privacy" element={<LegalPage kind="privacy" />} />
            <Route path="/legal/guidelines" element={<LegalPage kind="guidelines" />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/creator" element={<RequireCreator><CreatorDashboard /></RequireCreator>} />
            <Route path="/creator/titles" element={<RequireCreator><CreatorTitles /></RequireCreator>} />
            <Route path="/creator/upload" element={<RequireCreator><CreatorUpload /></RequireCreator>} />
            <Route path="/creator/lives" element={<RequireCreator><CreatorLives /></RequireCreator>} />
            <Route path="/creator/premiere" element={<RequireCreator><CreatorPremiere /></RequireCreator>} />
            <Route path="/creator/analytics" element={<RequireCreator><CreatorAnalytics /></RequireCreator>} />
            <Route path="/creator/monetization" element={<RequireCreator><CreatorMonetization /></RequireCreator>} />
            <Route path="/premiere/join" element={<PremiereRedeem />} />
            <Route path="/creator/more" element={<CreatorMore />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
