import { create } from "zustand";

import { getUpdateStatus, type UpdateStatus } from "@/http/endpoints/update";

interface UpdateStatusStore {
  status: UpdateStatus | null;
  /** Reads the update status once for everyone who asks at the same moment. `refresh` asks the update host again. */
  load: (refresh?: boolean) => Promise<UpdateStatus>;
}

let inFlight: Promise<UpdateStatus> | null = null;

/** The update status, shared by the Settings line and the notice in the menu. Administrators only. */
export const useUpdateStatus = create<UpdateStatusStore>((set) => ({
  status: null,
  load: (refresh = false) => {
    if (inFlight && !refresh) return inFlight;

    const request = getUpdateStatus(refresh)
      .then((response) => {
        set({ status: response.data });
        return response.data;
      })
      .finally(() => {
        if (inFlight === request) inFlight = null;
      });
    inFlight = request;

    return request;
  },
}));
