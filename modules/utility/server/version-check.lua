-- Yoinked & Modified from https://github.com/overextended/ox_lib/blob/master/resource/version/server.lua

local log = require("modules.utility.shared.logger")

---@param repository string
return function(repository)
	assert(repository, "[server] [version-check] param `respository` is nil.")

	local currentResourceName = GetCurrentResourceName()
	local currentVersion = GetResourceMetadata(currentResourceName, "version", 0)

	if currentVersion then
		currentVersion = currentVersion:match("%d+%.%d+%.%d+")
	end

	if not currentVersion then
		return log.warningf("Unable to determine the current version from the resource: (%s)", currentResourceName)
	end

	Citizen.SetTimeout(1000, function()
		PerformHttpRequest(("https://api.github.com/repos/%s/releases/latest"):format(repository),
			function(status, body, headers, errorData)
				if status ~= 200 then
					return log.verbosef(
						"[server] [version-check] api request wasn't successful, resource name: (%s), current-version: (%s), errorData: (%s)",
						currentResourceName, currentVersion, errorData)
				end

				body = json.decode(body)

				if body.prerelease then
					return log.verbosef(
						"[server]  [version-check] returned response for resource %s was a pre-release, returning.",
						currentResourceName)
				end

				local latestVersion = body.tag_name:match("%d+%.%d+%.%d+")

				if not latestVersion or latestVersion == currentVersion then
					return log.debugf(
						"[server] [version-check] either latest version is nil or latest version is the same as the current version, latestVersion: (%s), currentVersion: (%s)",
						latestVersion, currentVersion)
				end

				local cv = { string.strsplit(".", currentVersion) }
				local lv = { string.strsplit(".", latestVersion) }

				for i = 1, #cv do
					local current, minimum = tonumber(cv[i]), tonumber(lv[i])

					if current ~= minimum then
						if current < minimum then
							return print(
								("^3An update is available for Illenium Appearance — Modernized Re-design & Rewrite in Svelte 5 (current version: %s)\r\n Download v%s here: %s^0")
								:format(
									currentVersion,
									latestVersion,
									"https://portal.cfx.re/assets/granted-assets?page=1&sort=asset.updated_at&direction=asc&search=vx-illenium-rework"
								)
							)
						else
							break
						end
					end
				end
			end, "GET")
	end)

	log.verbosef("[server] [version-check] passed all checks for resource: (%s), version: (%s)", currentResourceName,
		currentVersion)
end
