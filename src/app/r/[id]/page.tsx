import { notFound } from "next/navigation";
import { mutate } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { CAN_RECEIVE_FROM, eligibility, matchDonors, sweep, trustLabel } from "@/lib/blood";
import RequestView from "./RequestView";

export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUserId();
  const data = await mutate((db) => {
    const r = db.requests.find((x) => x.id === id);
    if (!r) return null;
    sweep(r, db.users); // turn overdue promises into no-shows
    const viewer = db.users.find((u) => u.id === me) ?? null;
    const matches = matchDonors(r, db.users);
    const isOwner = Boolean(me && r.createdBy === me);
    const myAcceptance = r.acceptances.find((a) => a.donorId === me) ?? null;
    return {
      r: {
        ...r,
        // only the family sees arrival codes; donors see only their own status
        acceptances: r.acceptances.map((a) => {
          const d = db.users.find((u) => u.id === a.donorId);
          return { ...a, code: isOwner ? a.code : "", trust: d?.trust ?? 0, trustLabel: trustLabel(d?.trust ?? 0), group: d?.bloodGroup ?? "" };
        }),
        reports: [],
        reportCount: r.reports.length,
        fingerprints: [],
      },
      viewer: viewer
        ? { id: viewer.id, name: viewer.name, role: viewer.role, bloodGroup: viewer.bloodGroup, language: viewer.language, trust: viewer.trust, blocked: viewer.blocked, ...eligibility(viewer), compatible: Boolean(r.bloodGroup && viewer.bloodGroup && CAN_RECEIVE_FROM[r.bloodGroup].includes(viewer.bloodGroup)) }
        : null,
      isOwner,
      myAcceptance: myAcceptance ? { status: myAcceptance.status } : null,
      reported: Boolean(me && r.reports.includes(me)),
      pins: matches.map((m) => ({ id: m.user.id, lat: m.user.lat, lng: m.user.lng, label: m.user.name, group: m.user.bloodGroup ?? "", eligible: m.eligible, distanceKm: m.distanceKm, trust: m.user.trust, language: m.user.language, daysLeft: m.daysLeft })),
    };
  });
  if (!data) notFound();
  return <RequestView {...data} />;
}
