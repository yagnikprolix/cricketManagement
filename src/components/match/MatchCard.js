'use client';
import GroundArt from '@/components/ui/GroundArt';
import Chip from '@/components/ui/Chip';
import { Calendar, MapPin, Users, Clock, IndianRupee,
         Check, X, HelpCircle, Trophy, Radio } from 'lucide-react';

export default function MatchCard({ match, onClick, userRsvp }) {
  const yesAttendees = match.rsvps?.filter((r) => r.status === 'yes') || [];
  const yesCount = yesAttendees.length;
  const playerShare = yesCount > 0 ? ((match.totalCost || 0) / yesCount) : (match.totalCost || 0);
  
  const isLive = match.scorecard?.status === 'live';
  const isCompleted = match.scorecard?.status === 'completed';
  const state = isLive ? 'live' : isCompleted ? 'completed' : 'upcoming';

  const dateStr = new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  
  // Decide ground image based on id or location to be somewhat deterministic
  const groundVariants = ['ground-1', 'ground-2', 'ground-3'];
  const groundIdx = (match._id ? match._id.charCodeAt(match._id.length - 1) : 0) % 3;
  const imageVariant = groundVariants[groundIdx];

  return (
    <button
      onClick={onClick}
      className="m3-state block w-full text-left bg-[var(--surface-container-low)] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <GroundArt variant={imageVariant} state={state} height={130} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="m3-headline-sm truncate">{match.title}</h3>
            <p className="m3-body-sm text-[var(--on-surface-variant)] flex items-center gap-1 mt-0.5">
              <Calendar size={14} /> {dateStr} · {match.time.split(' – ')[0]}
            </p>
          </div>
          {isLive && match.scorecard?.runs !== undefined && (
            <div className="text-right shrink-0">
              <div className="m3-headline-md text-[var(--primary)] font-bold leading-none">
                {match.scorecard.runs}<span className="text-base text-[var(--on-surface-variant)] font-normal">/{match.scorecard.wickets}</span>
              </div>
              <div className="m3-label-sm text-[var(--on-surface-variant)] mt-1">{match.scorecard.overs}.{match.scorecard.balls} OV</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mb-3.5">
          <Row icon={MapPin}>{match.location}</Row>
          <Row icon={Users}>{yesCount} attending</Row>
          <Row icon={Clock}>{match.time}</Row>
          <Row icon={IndianRupee}>₹{playerShare.toFixed(2)}/person</Row>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {state === 'live'     && <Chip tone="live"    icon={Radio}    size="sm">LIVE NOW</Chip>}
          {state === 'upcoming' && <Chip tone="primary" icon={Calendar} size="sm">UPCOMING</Chip>}
          {state === 'completed'&& <Chip tone="neutral" icon={Trophy}   size="sm">COMPLETED</Chip>}
          {userRsvp?.status === 'yes'      && <Chip tone="success" icon={Check}    size="sm">You're in</Chip>}
          {userRsvp?.status === 'no'       && <Chip tone="error"   icon={X}        size="sm">Skipped</Chip>}
          {!userRsvp && state === 'upcoming'
                                  && <Chip tone="warning" icon={HelpCircle} size="sm">RSVP pending</Chip>}
          {userRsvp?.status === 'yes' && userRsvp.paymentStatus !== 'completed'
                                  && <Chip tone="warning" icon={Clock}    size="sm">Pay ₹{playerShare.toFixed(2)}</Chip>}
          {userRsvp?.status === 'yes' && userRsvp.paymentStatus === 'completed'
                                  && <Chip tone="success" icon={Check}    size="sm">Paid</Chip>}
        </div>
      </div>
    </button>
  );
}

function Row({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={16} className="text-[var(--primary)] shrink-0" />
      <span className="m3-body-md truncate">{children}</span>
    </div>
  );
}
