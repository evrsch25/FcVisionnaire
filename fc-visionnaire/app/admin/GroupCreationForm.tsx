"use client";

import { generateGroup } from "@/app/actions/admin";
import { useEffect, useState } from "react";

type GroupCreationFormProps = {
  groups: string[];
  existingGroupsData: Record<string, string[]>;
};

export default function GroupCreationForm({
  groups,
  existingGroupsData,
}: GroupCreationFormProps) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [teams, setTeams] = useState<string[]>(["", "", "", ""]);
  const [oldTeams, setOldTeams] = useState<string[]>(["", "", "", ""]);

  useEffect(() => {
    const data = existingGroupsData[selectedGroup];
    // Si des données existent pour ce groupe, on remplit les champs. Sinon, on les vide.
    if (data && data.length > 0) {
      const paddedData = [...data, "", "", "", ""].slice(0, 4);
      setTeams(paddedData);
      setOldTeams(paddedData); // Sauvegarde des équipes originales
    } else {
      setTeams(["", "", "", ""]);
      setOldTeams(["", "", "", ""]);
    }
  }, [selectedGroup, existingGroupsData]);

  const handleTeamChange = (index: number, value: string) => {
    const newTeams = [...teams];
    newTeams[index] = value;
    setTeams(newTeams);
  };

  return (
    <div className="bg-bg-panel p-6 rounded-xl border border-border-subtle">
      <h2 className="text-xl font-bold text-text-base uppercase tracking-wider mb-4">
        1. Créer ou Mettre à jour un Groupe
      </h2>
      <form action={generateGroup} className="flex flex-col gap-3">
        <select
          name="group_name"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="bg-bg-base text-text-base border border-border-subtle rounded p-3 outline-none focus:border-accent-main"
          required
        >
          <option value="">Sélectionner un Groupe...</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              Groupe {g}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex flex-col relative">
              {/* Champ caché pour envoyer l'ancienne valeur à l'action */}
              <input
                type="hidden"
                name={`old_team_${index + 1}`}
                value={oldTeams[index] || ""}
              />
              <input
                type="text"
                name={`team_${index + 1}`}
                placeholder={`Équipe ${index + 1}`}
                value={teams[index] || ""}
                onChange={(e) => handleTeamChange(index, e.target.value)}
                required
                className="w-full bg-bg-base text-text-base border border-border-subtle rounded p-3 outline-none focus:border-accent-main"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="bg-text-base text-bg-base font-black py-3 rounded uppercase hover:bg-gray-200 transition-colors mt-2 tracking-wider"
        >
          Générer / Mettre à jour
        </button>
      </form>
    </div>
  );
}
