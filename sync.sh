#!/bin/bash
rsync --progress -vazc --delete albums/ copper:/var/docker/p.funkenburg.net/albums
