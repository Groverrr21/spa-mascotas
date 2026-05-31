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

const ConLayout = ({ children, rolesPermitidos }) => (
  <PrivateRoute rolesPermitidos={rolesPermitidos}>
    <Layout>{children}</Layout>
  </PrivateRoute>
)

export default function AppRouter() {
  return (
    <Routes>

      {/* Pública */}
      <Route path="/" element={
        <PublicRoute><Auth /></PublicRoute>
      } />

      {/* Dashboard */}
      <Route path="/dashboard" element={
        <ConLayout><Dashboard /></ConLayout>
      } />

      {/* Mascotas */}
      <Route path="/mascotas" element={
        <ConLayout rolesPermitidos={['CLIENTE', 'GROOMER', 'ADMINISTRADOR']}>
          <Mascotas />
        </ConLayout>
      } />

      {/* Citas */}
      <Route path="/citas" element={
        <ConLayout><Citas /></ConLayout>
      } />

      {/* Fichas */}
      <Route path="/fichas" element={
        <ConLayout rolesPermitidos={['ADMINISTRADOR', 'GROOMER']}>
          <FichaTecnica />
        </ConLayout>
      } />

      {/* Calendario */}
      <Route path="/calendario" element={
        <ConLayout rolesPermitidos={['ADMINISTRADOR', 'CAJERO', 'GROOMER']}>
          <Calendario />
        </ConLayout>
      } />

      {/* Clientes */}
      <Route path="/clientes" element={
        <ConLayout rolesPermitidos={['CAJERO', 'ADMINISTRADOR']}>
          <Clientes />
        </ConLayout>
      } />

      {/* Servicios */}
      <Route path="/servicios" element={
        <ConLayout rolesPermitidos={['ADMINISTRADOR']}>
          <Servicios />
        </ConLayout>
      } />

      {/* Inventario */}
      <Route path="/inventario" element={
        <ConLayout rolesPermitidos={['ADMINISTRADOR', 'GROOMER']}>
          <Inventario />
        </ConLayout>
      } />

      {/* Tienda */}
      <Route path="/tienda" element={
        <ConLayout rolesPermitidos={['CLIENTE', 'ADMINISTRADOR']}>
          <Tienda />
        </ConLayout>
      } />

      {/* Facturas */}
      <Route path="/facturas" element={
        <ConLayout rolesPermitidos={['CAJERO', 'ADMINISTRADOR']}>
          <Facturas />
        </ConLayout>
      } />

      {/* Reportes */}
      <Route path="/reportes" element={
        <ConLayout rolesPermitidos={['ADMINISTRADOR']}>
          <Reportes />
        </ConLayout>
      } />

      {/* Admin */}
      <Route path="/admin/personal" element={
        <ConLayout rolesPermitidos={['ADMINISTRADOR']}>
          <GestionPersonal />
        </ConLayout>
      } />
      <Route path="/admin/logs" element={
        <ConLayout rolesPermitidos={['ADMINISTRADOR']}>
          <Logs />
        </ConLayout>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  )
}
