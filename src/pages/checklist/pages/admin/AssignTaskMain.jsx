"use client"
import { CalendarCheck, Wrench, Home } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AdminLayout from "../../components/layout/AdminLayout"

export default function AssignTaskMain() {
  const navigate = useNavigate()

  const taskTypes = [
    {
      id: "checklist",
      name: "Checklist",
      icon: CalendarCheck,
      description: "Assign recurring or one-time checklist tasks",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
    },
    {
      id: "maintenance",
      name: "Maintenance",
      icon: Wrench,
      description: "Assign maintenance and repair tasks",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
    },
    {
      id: "housekeeping",
      name: "Housekeeping",
      icon: Home,
      description: "Assign cleaning and housekeeping tasks",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
    },
  ]

  const handleTaskTypeClick = (taskId) => {
    navigate(`/dashboard/assign-task/${taskId}`)
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Assign New Task</h1>
            <p className="text-gray-600">Select a task type to get started</p>
          </div>

          {/* Task Type Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {taskTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleTaskTypeClick(type.id)}
                className={`relative rounded-xl p-6 shadow-lg transition-all duration-300 transform hover:scale-105 bg-white`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 p-4 rounded-full bg-gray-100">
                    <type.icon className={`h-8 w-8 ${type.color.replace("bg-", "text-")}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">{type.name}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
