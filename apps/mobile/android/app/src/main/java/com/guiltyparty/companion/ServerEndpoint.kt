package com.guiltyparty.companion

import java.net.Inet6Address
import java.net.InetAddress
import java.net.URI

class ServerEndpoint private constructor(
    val origin: String,
    val joinUrl: String,
    val resumeUrl: String,
    val webSocketUrl: String,
    val isInsecureDevelopment: Boolean,
) {
    override fun toString(): String = "ServerEndpoint(<redacted>)"

    companion object {
        fun remote(): ServerEndpoint = parse(BuildConfig.DEFAULT_API_ORIGIN, false)

        fun parse(raw: String, allowInsecureDevelopment: Boolean): ServerEndpoint {
            val normalized = raw.trim().trimEnd('/')
            val uri = runCatching { URI(normalized) }.getOrNull()
                ?: throw CompanionFailure(FailureKind.INVALID_RESPONSE)
            val secure = uri.scheme.equals("https", ignoreCase = true)
            val permittedDevelopment = allowInsecureDevelopment &&
                uri.scheme.equals("http", ignoreCase = true)
            if ((!secure && !permittedDevelopment) ||
                uri.host.isNullOrBlank() ||
                uri.userInfo != null ||
                uri.query != null ||
                uri.fragment != null ||
                (uri.path.isNotEmpty() && uri.path != "/")
            ) {
                throw CompanionFailure(FailureKind.INVALID_RESPONSE)
            }
            if (permittedDevelopment && !isLocalDevelopmentHost(uri.host)) {
                throw CompanionFailure(FailureKind.INVALID_RESPONSE)
            }
            val socketScheme = if (secure) "wss" else "ws"
            val authority = uri.rawAuthority
            return ServerEndpoint(
                origin = normalized,
                joinUrl = "$normalized/api/v1/join",
                resumeUrl = "$normalized/api/v1/resume",
                webSocketUrl = "$socketScheme://$authority/ws/v1",
                isInsecureDevelopment = permittedDevelopment,
            )
        }

        private fun isLocalDevelopmentHost(rawHost: String): Boolean {
            val host = rawHost.removePrefix("[").removeSuffix("]").lowercase()
            if (host == "localhost" || host.endsWith(".localhost")) return true
            val ipv4 = host.split('.').mapNotNull { part ->
                part.toIntOrNull()?.takeIf { it in 0..255 }
            }
            if (ipv4.size == 4 && host.count { it == '.' } == 3) {
                return ipv4[0] == 10 ||
                    ipv4[0] == 127 ||
                    (ipv4[0] == 169 && ipv4[1] == 254) ||
                    (ipv4[0] == 172 && ipv4[1] in 16..31) ||
                    (ipv4[0] == 192 && ipv4[1] == 168)
            }
            if (!host.contains(':') || !host.matches(Regex("^[0-9a-f:.]+$"))) return false
            val address = runCatching { InetAddress.getByName(host) }.getOrNull() as? Inet6Address
                ?: return false
            val first = address.address[0].toInt() and 0xff
            return address.isLoopbackAddress || address.isLinkLocalAddress || (first and 0xfe) == 0xfc
        }
    }
}
