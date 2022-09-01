#!/usr/bin/env bash

for i in 0x5fbb0bca991c333f586ff3a1d1af9dc741138239 0xb7b375505001a5dcc0747ee385ecfd304b41db7f 0xc6d37720abfdecb9f27b8d51258c8608802b8481 0xee0246b7ed519a4fd145eee2dcf52f7f73f2a8d7 0xf6fef069a24a2647bc535ba4b2ffdd9735e9a63b;
do 
    curl http://127.0.0.1:3333/request_neon -X POST -H "Content-Type: application/json" -v -d '{"amount":10000, "wallet":"'$i'"}' 2> /dev/null
    echo $?
done
