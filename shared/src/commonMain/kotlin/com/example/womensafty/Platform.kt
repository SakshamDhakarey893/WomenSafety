package com.example.womensafty

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform