import React from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import AdminDashboard from '../admin/Dashboard'
import { Navigate, useNavigate } from 'react-router-dom'


const Demo = () => {
  const navigate =useNavigate();
  const handleLogout=()=>{
    localStorage.removeItem("user-name")
    localStorage.removeItem("role")
    navigate("/login")
  }

  console.log(fetchAssignTaskSelectionApi())
  return (
    <div>
     {/* <AdminLayout/> */}
     <AdminDashboard/>

{/* <h1>hii everyone</h1>
     <button className='py2 px-4 bg-amber-600' onClick={handleLogout}>logout</button> */}
    </div>
  )
}

export default Demo
