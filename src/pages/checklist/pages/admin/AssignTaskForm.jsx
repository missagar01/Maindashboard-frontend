"use client"
import { useParams, useNavigate } from "react-router-dom"
import { CalendarCheck, Wrench, Home, ArrowLeft } from "lucide-react"
import ChecklistAssignTask from "./ChecklistAssignTask"
import MaintenanceAssignTask from "./MaintenanceTaskAssign"
import HousekeepingAssignTask from "./HousekeepingAssignTask"
import AdminLayout from "../../components/layout/AdminLayout"

export default function AssignTaskForm() {
  const { taskType } = useParams()
  const navigate = useNavigate()

  const taskTypeConfig = {
    checklist: {
      name: "Checklist Task",
      icon: CalendarCheck,
      component: ChecklistAssignTask,
      color: "from-blue-600 to-blue-700",
    },
    maintenance: {
      name: "Maintenance Task",
      icon: Wrench,
      component: MaintenanceAssignTask,
      color: "from-purple-600 to-purple-700",
    },
    housekeeping: {
      name: "Housekeeping Task",
      icon: Home,
      component: HousekeepingAssignTask,
      color: "from-green-600 to-green-700",
    },
  }

  const config = taskTypeConfig[taskType]

  if (!config) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-red-600">Invalid Task Type</h1>
            <button
              onClick={() => navigate("/dashboard/assign-task")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const IconComponent = config.icon
  const FormComponent = config.component

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate("/dashboard/assign-task")}
            className="mb-6 flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Task Selection</span>
          </button>

          {/* Task Form Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className={`bg-gradient-to-r ${config.color} px-6 py-6`}>
              <div className="flex items-center space-x-3">
                <IconComponent className="h-8 w-8 text-white" />
                <h1 className="text-2xl font-bold text-white">{config.name}</h1>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <FormComponent />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
