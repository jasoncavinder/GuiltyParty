package com.guiltyparty.companion

import guiltyparty.contracts.v1.GPJsonValue
import org.json.JSONArray
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

object ContractJson {
    fun decodeUtf8(bytes: ByteArray): String = try {
        StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(bytes))
            .toString()
    } catch (_: Exception) {
        throw CompanionFailure(FailureKind.INVALID_RESPONSE)
    }

    fun parse(text: String): GPJsonValue = fromPlatform(JSONObject(text))

    fun stringify(value: GPJsonValue): String = toPlatform(value).toString()

    private fun fromPlatform(value: Any?): GPJsonValue = when (value) {
        null, JSONObject.NULL -> GPJsonValue.NullValue
        is Boolean -> GPJsonValue.BooleanValue(value)
        is String -> GPJsonValue.StringValue(value)
        is Byte, is Short, is Int, is Long -> GPJsonValue.IntegerValue((value as Number).toLong())
        is Number -> {
            val decimal = value.toDouble()
            if (!decimal.isFinite() || decimal % 1.0 != 0.0 || decimal > 9_007_199_254_740_991.0 || decimal < -9_007_199_254_740_991.0) {
                throw CompanionFailure(FailureKind.INVALID_RESPONSE)
            }
            GPJsonValue.IntegerValue(decimal.toLong())
        }
        is JSONArray -> GPJsonValue.ArrayValue(
            List(value.length()) { index -> fromPlatform(value.get(index)) },
        )
        is JSONObject -> {
            val members = linkedMapOf<String, GPJsonValue>()
            val keys = value.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                members[key] = fromPlatform(value.get(key))
            }
            GPJsonValue.ObjectValue(members)
        }
        else -> throw CompanionFailure(FailureKind.INVALID_RESPONSE)
    }

    private fun toPlatform(value: GPJsonValue): Any = when (value) {
        GPJsonValue.NullValue -> JSONObject.NULL
        is GPJsonValue.BooleanValue -> value.value
        is GPJsonValue.IntegerValue -> value.value
        is GPJsonValue.StringValue -> value.value
        is GPJsonValue.ArrayValue -> JSONArray().apply {
            value.values.forEach { put(toPlatform(it)) }
        }
        is GPJsonValue.ObjectValue -> JSONObject().apply {
            value.members.forEach { (key, member) -> put(key, toPlatform(member)) }
        }
    }
}
