import { Shape } from "@SliceManager/types";

export type Template = {
  id: number;
  slice: Shape;
  point: [number, number];
  dataUrl: string;
};

// uses local storage to store template data, in an array of templates
export const removeTemplates = () => {
  localStorage.removeItem("templates");
};

export const saveTemplate = (template: Omit<Template, "id">) => {
  const templates = getTemplates();
  templates.push({ ...template, id: templates.length });
  localStorage.setItem("templates", JSON.stringify(templates));
};

export const getTemplates = () => {
  return localStorage.getItem("templates")
    ? JSON.parse(localStorage.getItem("templates")!)
    : [];
};

export const deleteTemplate = (id: number) => {
  const templates = getTemplates();
  const newTemplates = templates.filter(
    (template: Template) => template.id !== id
  );
  localStorage.setItem("templates", JSON.stringify(newTemplates));
};
