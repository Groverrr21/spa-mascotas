import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute    from './PrivateRoute'
import PublicRoute     from './PublicRoute'
import Layout          from '../components/layout/Layout'
import Auth            from '../pages/auth/Auth'
import Dashboard       from '../pages/dashboard/Dashboard'
import Mascotas        from '../pages/mascotas/Mascotas'
import Servicios       from '../pages/servicios/Servicios'
import Citas           from '../pages/citas/Citas'
import Clientes        from '../pages/clientes/Clientes'
import Facturas        from '../pages/facturas/Facturas'
import GestionPersonal from '../pages/admin/GestionPersonal'
import Logs            from '../pages/admin/Logs'
import Calendario      from '../pages/calendario/Calendario'
import Inventario      from '../pages/inventario/Inventario'
import Reportes        from '../pages/reportes/Reportes'
import FichaTecnica    from '../pages/fichas/FichaTecnica'
import Tienda          from '../pages/tienda/Tienda'
import Perfil          from '../pages/perfil/Perfil'

const ConLayout = ({ children, rolesPermitidos }) => (
  <PrivateRoute rolesPermitidos={rolesPermitidos}>
    <Layout>{children}</Layout>
  </PrivateRoute>
)

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Auth /></PublicRoute>} />

      <Route path="/dashboard"  element={<ConLayout><Dashboard /></ConLayout>} />
      <Route path="/perfil"     element={<ConLayout><Perfil /></ConLayout>} />
      <Route path="/mascotas"   element={<ConLayout rolesPermitidos={['CLIENTE','GROOMER','ADMINISTRADOR']}><Mascotas /></ConLayout>} />
      <Route path="/citas"      element={<ConLayout><Citas /></ConLayout>} />
      <Route path="/fichas"     element={<ConLayout rolesPermitidos={['ADMINISTRADOR','GROOMER']}><FichaTecnica /></ConLayout>} />
      <Route path="/calendario" element={<ConLayout rolesPermitidos={['ADMINISTRADOR','CAJERO','GROOMER']}><Calendario /></ConLayout>} />
      <Route path="/clientes"   element={<ConLayout rolesPermitidos={['CAJERO','ADMINISTRADOR']}><Clientes /></ConLayout>} />
      <Route path="/servicios"  element={<ConLayout rolesPermitidos={['ADMINISTRADOR']}><Servicios /></ConLayout>} />
      <Route path="/inventario" element={<ConLayout rolesPermitidos={['ADMINISTRADOR','GROOMER']}><Inventario /></ConLayout>} />
      <Route path="/tienda"     element={<ConLayout rolesPermitidos={['CLIENTE','ADMINISTRADOR']}><Tienda /></ConLayout>} />
      <Route path="/facturas"   element={<ConLayout rolesPermitidos={['CAJERO','ADMINISTRADOR']}><Facturas /></ConLayout>} />
      <Route path="/reportes"   element={<ConLayout rolesPermitidos={['ADMINISTRADOR']}><Reportes /></ConLayout>} />
      <Route path="/admin/personal" element={<ConLayout rolesPermitidos={['ADMINISTRADOR']}><GestionPersonal /></ConLayout>} />
      <Route path="/admin/logs"     element={<ConLayout rolesPermitidos={['ADMINISTRADOR']}><Logs /></ConLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
