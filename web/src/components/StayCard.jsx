import { Link } from 'react-router-dom';
import LeafRating from '../brand/LeafRating.jsx';

export default function StayCard({ stay }) {
  return (
    <Link to={`/verblijf/${stay.slug}`} className="stay-card">
      <div className="stay-card__media" aria-hidden="true">
        {stay.image_url ? (
          <img src={stay.image_url} alt="" loading="lazy" />
        ) : (
          <span className="stay-card__initial">{stay.name.charAt(0)}</span>
        )}
        <span className={`stay-card__badge stay-card__badge--${stay.levelKey}`}>
          {stay.levelLabel}
        </span>
      </div>
      <div className="stay-card__body">
        <div className="stay-card__top">
          <span className="stay-card__type">{stay.type}</span>
          <LeafRating level={stay.level} size={18} />
        </div>
        <h3 className="stay-card__name">{stay.name}</h3>
        <p className="stay-card__place">
          {stay.city}, {stay.country}
        </p>
      </div>
    </Link>
  );
}
