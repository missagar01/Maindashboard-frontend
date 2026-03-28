import { useEffect, useMemo, useRef, useState } from "react";
import { listProjects } from "../../../api/project/projectApi";
import { useAuth } from "../../../context/AuthContext";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const useProjectOptions = () => {
  const {
    projectProjects,
    projectProjectsLoading,
    projectProjectsError,
    loading: authLoading,
  } = useAuth();
  const [fallbackProjects, setFallbackProjects] = useState([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState("");
  const attemptedFetchRef = useRef(false);

  useEffect(() => {
    const normalizedProjects = ensureArray(projectProjects);
    if (normalizedProjects.length > 0) {
      setFallbackProjects(normalizedProjects);
      setFallbackError("");
      attemptedFetchRef.current = true;
    }
  }, [projectProjects]);

  useEffect(() => {
    if (authLoading || projectProjectsLoading || attemptedFetchRef.current) {
      return;
    }

    if (ensureArray(projectProjects).length > 0) {
      return;
    }

    attemptedFetchRef.current = true;
    let cancelled = false;

    const fetchProjects = async () => {
      setFallbackLoading(true);
      setFallbackError("");

      try {
        const nextProjects = await listProjects();
        if (!cancelled) {
          setFallbackProjects(ensureArray(nextProjects));
        }
      } catch (error) {
        console.error("Error fetching project options:", error);
        if (!cancelled) {
          setFallbackProjects([]);
          setFallbackError("Unable to load project options.");
        }
      } finally {
        if (!cancelled) {
          setFallbackLoading(false);
        }
      }
    };

    void fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [authLoading, projectProjects, projectProjectsLoading]);

  const projects = useMemo(() => {
    const normalizedProjects = ensureArray(projectProjects);
    return normalizedProjects.length > 0 ? normalizedProjects : fallbackProjects;
  }, [projectProjects, fallbackProjects]);

  return {
    projects,
    projectsLoading: projectProjectsLoading || fallbackLoading,
    projectsError: projectProjectsError || fallbackError,
  };
};

export default useProjectOptions;
