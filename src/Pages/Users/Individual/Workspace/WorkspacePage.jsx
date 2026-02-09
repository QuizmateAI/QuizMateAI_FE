import React from "react";
import WorkspaceHeader from "@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader";
import SourcesPanel from "@/Pages/Users/Individual/Workspace/Components/SourcesPanel";
import ChatPanel from "@/Pages/Users/Individual/Workspace/Components/ChatPanel";
import StudioPanel from "@/Pages/Users/Individual/Workspace/Components/StudioPanel";

function WorkspacePage() {
	return (
		<div className="bg-[#F7FBFF] min-h-screen flex flex-col">
			<WorkspaceHeader />
			<div className="flex-1 min-h-[calc(100vh-64px)]">
				<div className="max-w-[1740px] mx-auto px-4 py-4 h-full">
					<div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-4 h-[calc(100vh-64px-32px)]">
						<SourcesPanel />
						<ChatPanel />
						<StudioPanel />
					</div>
				</div>
			</div>
		</div>
	);
}

export default WorkspacePage;
