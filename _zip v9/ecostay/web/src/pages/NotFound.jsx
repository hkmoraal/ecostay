import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container pad center">
      <h1 className="page-title">Pagina niet gevonden</h1>
      <p className="muted">Deze pagina bestaat niet (meer).</p>
      <Link to="/" className="btn">Terug naar home</Link>
    </div>
  );
}
